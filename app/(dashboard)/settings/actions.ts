'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const accountSchema = z.object({
  billingCompany: z.string().trim().max(150).optional().default(''),
  billingAddress1: z.string().trim().max(200).optional().default(''),
  billingAddress2: z.string().trim().max(200).optional().default(''),
  billingCity: z.string().trim().max(100).optional().default(''),
  billingState: z.string().trim().max(100).optional().default(''),
  billingZip: z.string().trim().max(30).optional().default(''),
  billingCountry: z.string().trim().max(100).optional().default(''),
  billingTaxId: z.string().trim().max(100).optional().default(''),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimezone),
})

const preferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(100).refine(isValidTimezone),
})

export async function savePreferences(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const parsed = preferencesSchema.safeParse({ timezone: formData.get('timezone') })
  if (!parsed.success) redirect('/settings?tab=preferences&error=invalid')
  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone: parsed.data.timezone },
  })
  revalidatePath('/settings')
  redirect('/settings?tab=preferences&saved=1')
}

export async function saveAccountSettings(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = accountSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) redirect('/settings?tab=account&error=invalid')

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        billingCompany: parsed.data.billingCompany || null,
        billingAddress1: parsed.data.billingAddress1 || null,
        billingAddress2: parsed.data.billingAddress2 || null,
        billingCity: parsed.data.billingCity || null,
        billingState: parsed.data.billingState || null,
        billingZip: parsed.data.billingZip || null,
        billingCountry: parsed.data.billingCountry || null,
        billingTaxId: parsed.data.billingTaxId || null,
        timezone: parsed.data.timezone,
      },
    })
  } catch (error) {
    console.error('[saveAccountSettings] failed:', error)
    redirect('/settings?tab=account&error=save')
  }

  revalidatePath('/settings')
  redirect('/settings?tab=account&saved=1')
}

export async function saveName(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const name = z.string().trim().max(100).safeParse(formData.get('name'))
  if (!name.success) redirect('/settings?tab=account&error=invalid')
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.data || null },
  })
  revalidatePath('/settings')
  redirect('/settings?tab=account&saved=1')
}

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const currentPassword = z.string().min(1).max(128).safeParse(formData.get('currentPassword'))
  const password = z.string().min(12).max(128).safeParse(formData.get('password'))
  if (!currentPassword.success || !password.success) redirect('/settings?tab=security&error=password')

  const bcrypt = await import('bcryptjs')
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })
  if (!user || !(await bcrypt.compare(currentPassword.data, user.password))) {
    redirect('/settings?tab=security&error=password')
  }
  const hash = await bcrypt.hash(password.data, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash },
  })
  redirect('/settings?tab=security&password-updated=1')
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

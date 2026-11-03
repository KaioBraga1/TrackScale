import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  email: z.string().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .max(128, 'Maximum 128 characters'),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 5 registrations per hour per IP
  const { allowed } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid data.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    // Don't leak whether the email already exists (user enumeration)
    // Return generic success — login will fail later
    return NextResponse.json({ ok: true })
  }

  const passwordHash = await hash(password, 12)

  await prisma.user.create({
    data: { name, email, password: passwordHash },
  })

  return NextResponse.json({ ok: true })
}

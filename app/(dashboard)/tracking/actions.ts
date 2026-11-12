'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'
import { sendCapiTest } from '@/lib/meta-capi'

// Campo de formulário vazio/ausente vira undefined
const optionalField = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional())

const pixelSchema = z.object({
  name: z.string().trim().min(1).max(80),
  metaPixelId: z.string().regex(/^\d{10,20}$/),
  artistIds: z.array(z.string().cuid()).max(50),
  capiAccessToken: optionalField(z.string().trim().regex(/^[A-Za-z0-9_-]{20,500}$/)),
  testEventCode: optionalField(z.string().trim().regex(/^TEST\d{1,10}$/i)),
})

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user.id
}

export async function createPixel(formData: FormData) {
  const userId = await requireUser()
  const parsed = pixelSchema.safeParse({
    name: formData.get('name'),
    metaPixelId: formData.get('metaPixelId'),
    artistIds: formData.getAll('artistIds'),
    capiAccessToken: formData.get('capiAccessToken'),
    testEventCode: formData.get('testEventCode'),
  })
  if (!parsed.success) {
    redirect('/tracking?error=invalid')
  }

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.artist.count({
        where: { id: { in: parsed.data.artistIds }, userId },
      })
      if (count !== parsed.data.artistIds.length) throw new Error('INVALID_ARTIST_ASSIGNMENT')
      await tx.pixel.create({
        data: {
          userId,
          name: parsed.data.name,
          metaPixelId: parsed.data.metaPixelId,
          capiAccessToken: parsed.data.capiAccessToken ? encrypt(parsed.data.capiAccessToken) : null,
          testEventCode: parsed.data.testEventCode?.toUpperCase() ?? null,
          artists: { create: parsed.data.artistIds.map((artistId) => ({ artistId })) },
        },
      })
    })
  } catch (error) {
    console.error('[createPixel] failed:', error)
    redirect(error instanceof Error && error.message === 'INVALID_ARTIST_ASSIGNMENT'
      ? '/tracking?error=artist'
      : '/tracking?error=duplicate')
  }

  revalidatePath('/tracking')
  revalidatePath('/links/new')
  redirect('/tracking?created=1')
}

export async function updatePixel(formData: FormData) {
  const userId = await requireUser()
  const id = formData.get('id')
  const parsed = pixelSchema.safeParse({
    name: formData.get('name'),
    metaPixelId: formData.get('metaPixelId'),
    artistIds: formData.getAll('artistIds'),
    capiAccessToken: formData.get('capiAccessToken'),
    testEventCode: formData.get('testEventCode'),
  })
  if (typeof id !== 'string' || !parsed.success) redirect('/tracking?error=invalid')

  try {
    await prisma.$transaction(async (tx) => {
      const pixel = await tx.pixel.findFirst({ where: { id, userId }, select: { id: true } })
      if (!pixel) throw new Error('PIXEL_NOT_FOUND')
      const count = await tx.artist.count({
        where: { id: { in: parsed.data.artistIds }, userId },
      })
      if (count !== parsed.data.artistIds.length) throw new Error('INVALID_ARTIST_ASSIGNMENT')
      await tx.artistPixel.deleteMany({ where: { pixelId: id } })
      await tx.pixel.update({
        where: { id },
        data: {
          name: parsed.data.name,
          metaPixelId: parsed.data.metaPixelId,
          // token em branco = mantém o atual; checkbox 'clearToken' remove
          ...(parsed.data.capiAccessToken
            ? { capiAccessToken: encrypt(parsed.data.capiAccessToken) }
            : formData.get('clearToken') === 'on'
              ? { capiAccessToken: null }
              : {}),
          testEventCode: parsed.data.testEventCode?.toUpperCase() ?? null,
          artists: { create: parsed.data.artistIds.map((artistId) => ({ artistId })) },
        },
      })
    })
  } catch (error) {
    console.error('[updatePixel] failed:', error)
    redirect(error instanceof Error && error.message === 'PIXEL_NOT_FOUND'
      ? '/tracking?error=not-found'
      : error instanceof Error && error.message === 'INVALID_ARTIST_ASSIGNMENT'
        ? '/tracking?error=artist'
        : '/tracking?error=save')
  }

  revalidatePath('/tracking')
  revalidatePath('/dashboard')
  redirect('/tracking?updated=1')
}

export async function deletePixel(formData: FormData) {
  const userId = await requireUser()
  const id = formData.get('id')
  if (typeof id !== 'string') redirect('/tracking?error=invalid')
  await prisma.pixel.deleteMany({ where: { id, userId } })
  revalidatePath('/tracking')
  revalidatePath('/dashboard')
  redirect('/tracking?deleted=1')
}

// Envia um evento real ao Meta (CAPI) usando o token e o test code do pixel.
// Exige test code: sem ele o evento iria para os dados de produção.
export async function testPixel(formData: FormData) {
  const userId = await requireUser()
  const id = formData.get('id')
  if (typeof id !== 'string') redirect('/tracking?error=invalid')

  const pixel = await prisma.pixel.findFirst({
    where: { id, userId },
    select: { metaPixelId: true, capiAccessToken: true, testEventCode: true },
  })
  if (!pixel) redirect('/tracking?error=not-found')
  if (!pixel.testEventCode) redirect('/tracking?test=nocode')

  let token: string | null = null
  if (pixel.capiAccessToken) {
    try {
      token = decrypt(pixel.capiAccessToken)
    } catch {
      console.error('[testPixel] token ilegível', { pixelId: pixel.metaPixelId })
    }
  }
  token ??= process.env.META_CAPI_ACCESS_TOKEN || null
  if (!token) redirect('/tracking?test=notoken')

  const h = headers()
  const result = await sendCapiTest({
    pixelId: pixel.metaPixelId,
    accessToken: token,
    testEventCode: pixel.testEventCode,
    clientIp: h.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0',
    clientUserAgent: h.get('user-agent') ?? 'TrackScaler',
    sourceUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://trackscaler.com',
  })

  if (result.ok) redirect('/tracking?test=ok')
  redirect(`/tracking?test=fail&detail=${encodeURIComponent(result.detail.slice(0, 160))}`)
}

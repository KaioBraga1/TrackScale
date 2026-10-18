'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const pixelSchema = z.object({
  name: z.string().trim().min(1).max(80),
  metaPixelId: z.string().regex(/^\d{10,20}$/),
  artistIds: z.array(z.string().cuid()).max(50),
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

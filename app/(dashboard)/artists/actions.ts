'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const artistSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100).trim(),
  spotifyId: z
    .string()
    .regex(/^[A-Za-z0-9]{22}$/, 'Spotify ID inválido (22 caracteres)')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string().url('URL inválida').max(2048).optional().or(z.literal('')),
})

export type ArtistFormState = {
  error?: string
} | null

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user.id
}

export async function createArtist(
  _prev: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const userId = await requireUser()

  const parsed = artistSchema.safeParse({
    name: formData.get('name'),
    spotifyId: (formData.get('spotifyId') as string)?.trim() || undefined,
    imageUrl: (formData.get('imageUrl') as string)?.trim() || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { name, spotifyId, imageUrl } = parsed.data

  try {
    await prisma.artist.create({
      data: {
        userId,
        name,
        spotifyId: spotifyId || null,
        imageUrl: imageUrl || null,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Já existe um artista com esse nome ou Spotify ID nesta conta.' }
    }
    console.error('[createArtist]', e)
    return { error: 'Erro interno. Tente novamente.' }
  }

  revalidatePath('/artists')
  return null
}

export async function updateArtist(
  id: string,
  _prev: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const userId = await requireUser()

  const artist = await prisma.artist.findUnique({ where: { id }, select: { userId: true } })
  if (!artist || artist.userId !== userId) return { error: 'Artista não encontrado.' }

  const parsed = artistSchema.safeParse({
    name: formData.get('name'),
    spotifyId: (formData.get('spotifyId') as string)?.trim() || undefined,
    imageUrl: (formData.get('imageUrl') as string)?.trim() || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { name, spotifyId, imageUrl } = parsed.data

  try {
    await prisma.artist.update({
      where: { id },
      data: {
        name,
        spotifyId: spotifyId || null,
        imageUrl: imageUrl || null,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Já existe um artista com esse nome ou Spotify ID nesta conta.' }
    }
    console.error('[updateArtist]', e)
    return { error: 'Erro interno. Tente novamente.' }
  }

  revalidatePath('/artists')
  return null
}

export async function deleteArtist(formData: FormData) {
  const userId = await requireUser()
  const id = formData.get('id') as string
  if (!id) return

  const artist = await prisma.artist.findUnique({ where: { id }, select: { userId: true } })
  if (!artist || artist.userId !== userId) return

  await prisma.artist.delete({ where: { id } })
  revalidatePath('/artists')
}

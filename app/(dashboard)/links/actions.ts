'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$|^[a-z0-9]$/
const VALID_THEMES = ['dark-navy', 'dark-purple', 'midnight', 'forest', 'ocean', 'crimson'] as const

const platformSchema = z.object({
  name: z.enum(['spotify', 'apple_music', 'youtube_music', 'deezer']),
  url: z.string().url('URL inválida').max(2048),
  deeplinkUrl: z.string().url('Deeplink inválido').max(2048).optional().or(z.literal('')),
  order: z.number().int().min(0).max(10),
  isActive: z.boolean(),
})

const linkSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(100).trim(),
  artist: z.string().max(100).trim().optional().or(z.literal('')),
  slug: z
    .string()
    .min(1, 'Slug obrigatório')
    .max(50)
    .regex(SLUG_REGEX, 'Slug: apenas letras minúsculas, números e hífens'),
  coverUrl: z.string().url('URL inválida').max(2048).optional().or(z.literal('')),
  theme: z.enum(VALID_THEMES).default('dark-navy'),
  spotifyArtistId: z.string().regex(/^[A-Za-z0-9]{22}$/).optional().or(z.literal('')),
  spotifyArtistName: z.string().max(100).optional().or(z.literal('')),
  spotifyPlaylistId: z.string().regex(/^[A-Za-z0-9]{22}$/).optional().or(z.literal('')),
  pixelIds: z.array(z.string().cuid()).max(20),
  artistIds: z.array(z.string().cuid()).max(50),
  platforms: z.array(platformSchema).min(1, 'Adicione ao menos um destino de streaming')
    .refine((platforms) => platforms.some((platform) => platform.isActive), 'Ative ao menos uma plataforma'),
})

export type LinkFormState = {
  error?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> }
} | null

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user.id
}

export async function createLink(
  _prev: LinkFormState,
  formData: FormData
): Promise<LinkFormState> {
  const userId = await requireUser()

  const raw = extractLinkFromForm(formData)
  const parsed = linkSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.flatten() as any }
  }

  const {
    title, artist, slug, coverUrl, theme, spotifyArtistId, spotifyArtistName,
    spotifyPlaylistId, pixelIds, artistIds: selectedArtistIds, platforms,
  } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const ownedPixels = await tx.pixel.count({ where: { id: { in: pixelIds }, userId } })
      if (ownedPixels !== pixelIds.length) throw new Error('INVALID_PIXEL_ASSIGNMENT')
      const ownedArtists = await tx.artist.count({ where: { id: { in: selectedArtistIds }, userId } })
      if (ownedArtists !== selectedArtistIds.length) throw new Error('INVALID_ARTIST_ASSIGNMENT')

      const artistRecord = await resolveSpotifyArtist(tx, {
        userId,
        artist: artist || '',
        spotifyArtistName: spotifyArtistName || '',
        spotifyArtistId: spotifyArtistId || '',
      })
      const artistIds = await resolveArtists(tx, userId, artist || '', artistRecord?.id)
      const assignedArtistIds = [...new Set([...selectedArtistIds, ...artistIds])]
      await tx.link.create({
        data: {
          userId,
          title,
          artist: artist || null,
          artistId: artistRecord?.id,
          slug,
          coverUrl: coverUrl || null,
          theme,
          spotifyPlaylistId: spotifyPlaylistId || null,
          platforms: {
            create: platforms.map(({ name, url, deeplinkUrl, order, isActive }) => ({
              name, url, deeplinkUrl: deeplinkUrl || null, order, isActive,
            })),
          },
          pixels: { create: pixelIds.map((pixelId) => ({ pixelId })) },
          artists: { create: assignedArtistIds.map((artistId) => ({ artistId })) },
        },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: { formErrors: ['Esse slug já está em uso.'], fieldErrors: {} } }
    }
    if (e instanceof Error && e.message === 'INVALID_PIXEL_ASSIGNMENT') {
      return { error: { formErrors: ['Um dos pixels selecionados não pertence a esta conta.'], fieldErrors: {} } }
    }
    if (e instanceof Error && e.message === 'INVALID_ARTIST_ASSIGNMENT') {
      return { error: { formErrors: ['Um dos artistas selecionados não pertence a esta conta.'], fieldErrors: {} } }
    }
    console.error('[createLink]', e)
    return { error: { formErrors: ['Erro interno. Tente novamente.'], fieldErrors: {} } }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateLink(
  id: string,
  _prev: LinkFormState,
  formData: FormData
): Promise<LinkFormState> {
  const userId = await requireUser()

  const link = await prisma.link.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!link || link.userId !== userId) {
    return { error: { formErrors: ['Link não encontrado.'], fieldErrors: {} } }
  }

  const raw = extractLinkFromForm(formData)
  const parsed = linkSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.flatten() as any }
  }

  const {
    title, artist, slug, coverUrl, theme, spotifyArtistId, spotifyArtistName,
    spotifyPlaylistId, pixelIds, artistIds: selectedArtistIds, platforms,
  } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const ownedPixels = await tx.pixel.count({ where: { id: { in: pixelIds }, userId } })
      if (ownedPixels !== pixelIds.length) throw new Error('INVALID_PIXEL_ASSIGNMENT')
      const ownedArtists = await tx.artist.count({ where: { id: { in: selectedArtistIds }, userId } })
      if (ownedArtists !== selectedArtistIds.length) throw new Error('INVALID_ARTIST_ASSIGNMENT')
      const artistRecord = await resolveSpotifyArtist(tx, {
        userId,
        artist: artist || '',
        spotifyArtistName: spotifyArtistName || '',
        spotifyArtistId: spotifyArtistId || '',
      })
      const artistIds = await resolveArtists(tx, userId, artist || '', artistRecord?.id)
      const assignedArtistIds = [...new Set([...selectedArtistIds, ...artistIds])]
      await tx.platform.deleteMany({ where: { linkId: id } })
      await tx.linkPixel.deleteMany({ where: { linkId: id } })
      await tx.linkArtist.deleteMany({ where: { linkId: id } })
      await tx.link.update({
        where: { id },
        data: {
          title,
          artist: artist || null,
          artistId: artistRecord?.id,
          slug,
          coverUrl: coverUrl || null,
          theme,
          spotifyPlaylistId: spotifyPlaylistId || null,
          platforms: {
            create: platforms.map(({ name, url, deeplinkUrl, order, isActive }) => ({
              name, url, deeplinkUrl: deeplinkUrl || null, order, isActive,
            })),
          },
          pixels: { create: pixelIds.map((pixelId) => ({ pixelId })) },
          artists: { create: assignedArtistIds.map((artistId) => ({ artistId })) },
        },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: { formErrors: ['Esse slug já está em uso.'], fieldErrors: {} } }
    }
    if (e instanceof Error && e.message === 'INVALID_PIXEL_ASSIGNMENT') {
      return { error: { formErrors: ['Um dos pixels selecionados não pertence a esta conta.'], fieldErrors: {} } }
    }
    if (e instanceof Error && e.message === 'INVALID_ARTIST_ASSIGNMENT') {
      return { error: { formErrors: ['Um dos artistas selecionados não pertence a esta conta.'], fieldErrors: {} } }
    }
    console.error('[updateLink]', e)
    return { error: { formErrors: ['Erro interno. Tente novamente.'], fieldErrors: {} } }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/links/${id}`)
  redirect('/dashboard')
}

export async function toggleLinkActive(id: string, isActive: boolean) {
  const userId = await requireUser()
  const link = await prisma.link.findUnique({ where: { id }, select: { userId: true } })
  if (!link || link.userId !== userId) return
  await prisma.link.update({ where: { id }, data: { isActive } })
  revalidatePath('/dashboard')
}

export async function deleteLink(id: string) {
  const userId = await requireUser()
  const link = await prisma.link.findUnique({ where: { id }, select: { userId: true } })
  if (!link || link.userId !== userId) return
  await prisma.link.delete({ where: { id } })
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

function extractLinkFromForm(formData: FormData) {
  const PLATFORMS = ['spotify', 'apple_music', 'youtube_music', 'deezer'] as const

  const platforms = PLATFORMS.flatMap((name) => {
    const url = (formData.get(name) as string)?.trim()
    const deeplinkUrl = (formData.get(`deeplink_${name}`) as string)?.trim()
    const orderValue = formData.get(`order_${name}`)
    const order = Number(orderValue)
    const isActive = formData.get(`active_${name}`) === 'true'
    return url ? [{ name, url, deeplinkUrl, order: Number.isInteger(order) ? order : PLATFORMS.indexOf(name), isActive }] : []
  })

  return {
    title: formData.get('title'),
    artist: ((formData.get('artist') as string) ?? '').trim(),
    slug: (formData.get('slug') as string)?.toLowerCase().trim(),
    coverUrl: formData.get('coverUrl'),
    theme: formData.get('theme') as string || 'dark-navy',
    spotifyArtistId: formData.get('spotifyArtistId'),
    spotifyArtistName: formData.get('spotifyArtistName'),
    spotifyPlaylistId: formData.get('spotifyPlaylistId'),
    pixelIds: formData.getAll('pixelIds').filter((id): id is string => typeof id === 'string' && id.length > 0),
    artistIds: formData.getAll('artistIds').filter((id): id is string => typeof id === 'string' && id.length > 0),
    platforms,
  }
}

async function resolveSpotifyArtist(
  tx: Prisma.TransactionClient,
  input: { userId: string; artist: string; spotifyArtistName: string; spotifyArtistId: string }
) {
  const name = input.spotifyArtistName || input.artist.split(',')[0]?.trim()
  if (!name || !input.spotifyArtistId) return null
  return tx.artist.upsert({
    where: { userId_name: { userId: input.userId, name } },
    create: { userId: input.userId, name, spotifyId: input.spotifyArtistId },
    update: { spotifyId: input.spotifyArtistId },
    select: { id: true },
  })
}

async function resolveArtists(
  tx: Prisma.TransactionClient,
  userId: string,
  artistNames: string,
  primarySpotifyArtistId?: string
): Promise<string[]> {
  const names = [...new Set(artistNames.split(',').map((name) => name.trim()).filter(Boolean))]
  const ids: string[] = []
  for (const [index, name] of names.entries()) {
    const artist = await tx.artist.upsert({
      where: { userId_name: { userId, name } },
      create: {
        userId,
        name,
        ...(index === 0 && primarySpotifyArtistId ? { spotifyId: primarySpotifyArtistId } : {}),
      },
      update: index === 0 && primarySpotifyArtistId ? { spotifyId: primarySpotifyArtistId } : {},
      select: { id: true },
    })
    ids.push(artist.id)
  }
  return ids
}

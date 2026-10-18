import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getValidSpotifyToken } from '@/lib/spotify'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url(),
})

// Extrai tipo e ID de qualquer URL do Spotify
function parseSpotifyUrl(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/)
  if (!match) return null
  return { type: match[1] as 'track' | 'album' | 'playlist', id: match[2] }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  const item = parseSpotifyUrl(parsed.data.url)
  if (!item) return NextResponse.json({ error: 'URL do Spotify inválida. Use uma URL de faixa, álbum ou playlist.' }, { status: 400 })

  const token = await getValidSpotifyToken(session.user.id)
  if (!token) {
    return NextResponse.json(
      { error: 'Spotify não conectado', needsAuth: true },
      { status: 403 }
    )
  }

  const apiUrl = `https://api.spotify.com/v1/${item.type}s/${item.id}`
  const spotifyRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })

  if (!spotifyRes.ok) {
    return NextResponse.json({ error: 'Não foi possível buscar dados do Spotify' }, { status: 502 })
  }

  const data = await spotifyRes.json()

  // Normaliza a resposta para track / album / playlist
  let title: string
  let artist: string | null
  let coverUrl: string | null
  let spotifyArtistId: string | null = null
  let spotifyArtistName: string | null = null
  let spotifyPlaylistId: string | null = null
  let spotifyUrl: string | null = null

  if (item.type === 'track') {
    title = data.name
    artist = data.artists?.map((a: { name: string }) => a.name).join(', ') ?? null
    spotifyArtistId = data.artists?.[0]?.id ?? null
    spotifyArtistName = data.artists?.[0]?.name ?? null
    coverUrl = data.album?.images?.[0]?.url ?? null
    spotifyUrl = data.external_urls?.spotify ?? parsed.data.url
  } else if (item.type === 'album') {
    title = data.name
    artist = data.artists?.map((a: { name: string }) => a.name).join(', ') ?? null
    spotifyArtistId = data.artists?.[0]?.id ?? null
    spotifyArtistName = data.artists?.[0]?.name ?? null
    coverUrl = data.images?.[0]?.url ?? null
    spotifyUrl = data.external_urls?.spotify ?? parsed.data.url
  } else {
    // playlist
    title = data.name
    artist = data.owner?.display_name ?? null
    coverUrl = data.images?.[0]?.url ?? null
    spotifyPlaylistId = item.id
    spotifyUrl = data.external_urls?.spotify ?? parsed.data.url
  }

  return NextResponse.json({
    title,
    artist,
    coverUrl,
    type: item.type,
    spotifyArtistId,
    spotifyArtistName,
    spotifyPlaylistId,
    spotifyUrl,
  })
}

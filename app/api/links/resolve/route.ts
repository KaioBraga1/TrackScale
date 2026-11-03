import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { fetchSpotifyMetadata } from '@/lib/spotify-client-credentials'
import { resolveViaOdesli } from '@/lib/odesli'

const schema = z.object({
  url: z.string().url('Invalid URL').max(2048),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const { url } = parsed.data

  // Spotify + Odesli in parallel to minimize latency
  const [spotifyResult, odesliResult] = await Promise.allSettled([
    fetchSpotifyMetadata(url),
    resolveViaOdesli(url),
  ])

  const meta = spotifyResult.status === 'fulfilled' ? spotifyResult.value : null
  const odesli =
    odesliResult.status === 'fulfilled'
      ? odesliResult.value
      : { platformUrls: {}, resolvedCount: 0 }

  if (!meta && odesli.resolvedCount === 0) {
    return NextResponse.json(
      { error: 'Could not resolve this link. Check the URL and try again.' },
      { status: 422 }
    )
  }

  // Final URLs: Odesli as primary source (has native URLs per platform)
  // If Odesli didn't return Spotify but the original URL is from Spotify, use it
  const platformUrls = { ...odesli.platformUrls }
  if (meta && !platformUrls.spotify) {
    platformUrls.spotify = url
  }

  // Generate suggested slug from title
  const suggestedSlug = meta?.title
    ? meta.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)
    : null

  return NextResponse.json({
    title: meta?.title ?? null,
    artist: meta?.artist ?? null,
    artists: meta?.artists ?? [],
    coverUrl: meta?.coverUrl ?? null,
    suggestedSlug,
    spotifyPlaylistId: meta?.type === 'playlist' ? meta.spotifyId : null,
    spotifyArtistId: meta?.artists?.[0]?.id ?? null,
    spotifyArtistName: meta?.artists?.[0]?.name ?? null,
    platformUrls,
    resolvedCount: odesli.resolvedCount,
  })
}

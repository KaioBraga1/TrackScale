import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { fetchSpotifyMetadata } from '@/lib/spotify-client-credentials'
import { resolveViaOdesli } from '@/lib/odesli'

const schema = z.object({
  url: z.string().url('URL inválida').max(2048),
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
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  const { url } = parsed.data

  // Spotify + Odesli em paralelo para minimizar latência
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
      { error: 'Não foi possível resolver este link. Verifique a URL e tente novamente.' },
      { status: 422 }
    )
  }

  // URLs finais: Odesli como fonte primária (tem URLs nativas por plataforma)
  // Se Odesli não retornou Spotify mas a URL original é do Spotify, usa ela
  const platformUrls = { ...odesli.platformUrls }
  if (meta && !platformUrls.spotify) {
    platformUrls.spotify = url
  }

  // Gera slug sugerido a partir do título
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

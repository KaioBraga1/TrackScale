// Mapeamento de chaves da Odesli para nomes internos de plataforma
const PLATFORM_MAP: Record<string, string> = {
  spotify: 'spotify',
  appleMusic: 'apple_music',
  youtubeMusic: 'youtube_music',
  deezer: 'deezer',
}

export interface OdesliResult {
  platformUrls: Partial<Record<string, string>>
  resolvedCount: number
}

export async function resolveViaOdesli(url: string): Promise<OdesliResult> {
  const apiKey = process.env.ODESLI_API_KEY
  const qs = new URLSearchParams({ url, songIfSingle: 'true' })
  if (apiKey) qs.set('key', apiKey)
  const apiUrl = `https://api.song.link/v1-alpha.1/links?${qs.toString()}`

  let res: Response
  try {
    res = await fetch(apiUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })
  } catch {
    return { platformUrls: {}, resolvedCount: 0 }
  }

  if (!res.ok) return { platformUrls: {}, resolvedCount: 0 }

  let data: { linksByPlatform?: Record<string, { url: string }> }
  try {
    data = await res.json()
  } catch {
    return { platformUrls: {}, resolvedCount: 0 }
  }

  const linksByPlatform = data.linksByPlatform ?? {}
  const platformUrls: Partial<Record<string, string>> = {}
  let resolvedCount = 0

  for (const [odesliKey, internalKey] of Object.entries(PLATFORM_MAP)) {
    const entry = linksByPlatform[odesliKey]
    if (entry?.url) {
      platformUrls[internalKey] = entry.url
      resolvedCount++
    }
  }

  return { platformUrls, resolvedCount }
}

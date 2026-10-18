interface TokenCache {
  token: string
  expiresAt: number
}

// Módulo-level cache — dura ~1h por token
let tokenCache: TokenCache | null = null

async function getAppToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Spotify token failed: ${res.status}`)

  const data = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return tokenCache.token
}

export type SpotifyItemType = 'track' | 'album' | 'playlist'

export interface SpotifyMetadata {
  type: SpotifyItemType
  spotifyId: string
  title: string
  artist: string
  artists: Array<{ name: string; id: string }>
  coverUrl: string | null
  spotifyPlaylistId?: string
}

export function parseSpotifyUrl(url: string): { type: SpotifyItemType; id: string } | null {
  const match = url.match(
    /open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]{22})/
  )
  if (!match) return null
  return { type: match[1] as SpotifyItemType, id: match[2] }
}

export async function fetchSpotifyMetadata(url: string): Promise<SpotifyMetadata | null> {
  const parsed = parseSpotifyUrl(url)
  if (!parsed) return null

  let token: string
  try {
    token = await getAppToken()
  } catch {
    return null
  }

  const typeMap: Record<SpotifyItemType, string> = {
    track: 'tracks',
    album: 'albums',
    playlist: 'playlists',
  }

  const res = await fetch(
    `https://api.spotify.com/v1/${typeMap[parsed.type]}/${parsed.id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    }
  )

  if (!res.ok) return null
  const data = await res.json()

  if (parsed.type === 'track') {
    const artists: Array<{ name: string; id: string }> = data.artists ?? []
    const images: Array<{ url: string }> = data.album?.images ?? []
    return {
      type: 'track',
      spotifyId: data.id,
      title: data.name,
      artist: artists.map((a) => a.name).join(', '),
      artists,
      coverUrl: images[0]?.url ?? null,
    }
  }

  if (parsed.type === 'album') {
    const artists: Array<{ name: string; id: string }> = data.artists ?? []
    const images: Array<{ url: string }> = data.images ?? []
    return {
      type: 'album',
      spotifyId: data.id,
      title: data.name,
      artist: artists.map((a) => a.name).join(', '),
      artists,
      coverUrl: images[0]?.url ?? null,
    }
  }

  if (parsed.type === 'playlist') {
    const images: Array<{ url: string }> = data.images ?? []
    return {
      type: 'playlist',
      spotifyId: data.id,
      title: data.name,
      artist: data.owner?.display_name ?? '',
      artists: [],
      coverUrl: images[0]?.url ?? null,
      spotifyPlaylistId: data.id,
    }
  }

  return null
}

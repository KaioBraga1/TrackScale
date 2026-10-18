import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/crypto'

export async function getValidSpotifyToken(userId: string): Promise<string | null> {
  const connection = await prisma.spotifyConnection.findUnique({ where: { userId } })
  if (!connection) return null

  const accessToken = decrypt(connection.accessToken)
  if (connection.expiresAt.getTime() > Date.now() + 60_000) return accessToken

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Spotify OAuth credentials are not configured')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decrypt(connection.refreshToken),
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    console.error('[spotify] refresh token request failed:', response.status)
    return null
  }

  const data = await response.json()
  if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') {
    throw new Error('Spotify token refresh returned an invalid response')
  }
  await prisma.spotifyConnection.update({
    where: { userId },
    data: {
      accessToken: encrypt(data.access_token),
      ...(typeof data.refresh_token === 'string' ? { refreshToken: encrypt(data.refresh_token) } : {}),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  })
  return data.access_token
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?spotify=error`)
  }

  let userId: string
  const oauthStateCookie = req.cookies.get('spotify_oauth_state')?.value
  if (!oauthStateCookie || oauthStateCookie !== state) {
    return NextResponse.redirect(`${appUrl}/settings?spotify=error`)
  }
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    // State expira em 10 minutos
    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      const response = NextResponse.redirect(`${appUrl}/dashboard?spotify=expired`)
      response.cookies.delete('spotify_oauth_state')
      return response
    }
  } catch {
    const response = NextResponse.redirect(`${appUrl}/dashboard?spotify=error`)
    response.cookies.delete('spotify_oauth_state')
    return response
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!

  // Troca o code por token
  let tokenData: {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[spotify callback] token exchange failed', await tokenRes.text())
      return NextResponse.redirect(`${appUrl}/dashboard?spotify=error`)
    }

    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('[spotify callback] network error', err)
    return NextResponse.redirect(`${appUrl}/dashboard?spotify=error`)
  }

  // Busca perfil do Spotify
  let spotifyId: string | null = null
  try {
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (profileRes.ok) {
      const profile = await profileRes.json()
      spotifyId = profile.id ?? null
    }
  } catch {}

  // Salva tokens criptografados em repouso
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

  await prisma.spotifyConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: encrypt(tokenData.refresh_token),
      expiresAt,
      spotifyId,
    },
    update: {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: encrypt(tokenData.refresh_token),
      expiresAt,
      spotifyId,
    },
  })

  const response = NextResponse.redirect(`${appUrl}/dashboard?spotify=connected`)
  response.cookies.delete('spotify_oauth_state')
  return response
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  let slug = ''
  let visitorId: string | null = null

  // Tenta decodificar o state para saber o slug (para redirect correto)
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
      slug = decoded.slug ?? ''
      visitorId = decoded.visitorId ?? null
    }
  } catch {}

  const redirectBase = slug ? `${appUrl}/l/${slug}` : appUrl

  if (error || !code || !state) {
    return NextResponse.redirect(`${redirectBase}?spotify=error`)
  }

  // Valida state: máx 10 min
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(`${redirectBase}?spotify=expired`)
    }
  } catch {
    return NextResponse.redirect(`${redirectBase}?spotify=error`)
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/auth/spotify/visitor/callback`

  // Troca code por token
  let accessToken: string
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!tokenRes.ok) {
      return NextResponse.redirect(`${redirectBase}?spotify=error`)
    }
    const data = await tokenRes.json()
    accessToken = data.access_token
  } catch {
    return NextResponse.redirect(`${redirectBase}?spotify=error`)
  }

  // Busca perfil do visitante no Spotify
  try {
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(3000),
    })
    if (profileRes.ok) {
      const profile = await profileRes.json()
      if (visitorId) {
        await prisma.visitor.update({
          where: { id: visitorId },
          data: {
            spotifyUserId: profile.id ?? null,
            spotifyDisplayName: profile.display_name ?? null,
            spotifyEmail: profile.email ?? null,
          },
        }).catch(() => {})
      }
    }
  } catch {}

  return NextResponse.redirect(`${redirectBase}?spotify=connected`)
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-position',
].join(' ')

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Spotify OAuth não configurado' },
      { status: 500 }
    )
  }

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, ts: Date.now() })
  ).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  )
  response.cookies.set('spotify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })
  return response
}

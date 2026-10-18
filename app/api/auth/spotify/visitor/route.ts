import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  visitorId: z.string().max(64).optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const parsed = schema.safeParse({
    slug: searchParams.get('slug') ?? '',
    visitorId: searchParams.get('visitorId') ?? undefined,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!parsed.success) {
    return NextResponse.redirect(`${appUrl}`)
  }

  const { slug, visitorId } = parsed.data

  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/l/${slug}?spotify=error`)
  }

  const redirectUri = `${appUrl}/api/auth/spotify/visitor/callback`

  const state = Buffer.from(
    JSON.stringify({ slug, visitorId: visitorId ?? null, ts: Date.now() })
  ).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-private user-read-email',
    redirect_uri: redirectUri,
    state,
  })

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  )
}

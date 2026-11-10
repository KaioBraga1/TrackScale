import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMetaOAuthUrl } from '@/lib/meta'
import { randomBytes } from 'crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  if (!process.env.META_APP_ID) {
    redirect('/campaigns?error=meta_not_configured')
  }

  const state = randomBytes(16).toString('hex')
  const oauthUrl = getMetaOAuthUrl(state)

  // Store state in a short-lived cookie (checked in callback)
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl,
      'Set-Cookie': `meta_oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`,
    },
  })
  return response
}

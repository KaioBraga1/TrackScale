import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForToken, getLongLivedToken, getMetaMe, getAdAccounts, META_REDIRECT_PATH } from '@/lib/meta'
import { getAppBaseUrl } from '@/lib/base-url'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  if (error) redirect('/campaigns?error=meta_oauth_denied')
  if (!code) redirect('/campaigns?error=missing_oauth_code')

  // Validate state
  const cookieState = request.cookies.get('meta_oauth_state')?.value
  if (!cookieState || cookieState !== state) {
    redirect('/campaigns?error=invalid_state')
  }

  try {
    // Exchange code for short-lived token (redirect_uri must match the authorize step)
    const redirectUri = `${getAppBaseUrl(request)}${META_REDIRECT_PATH}`
    const shortToken = await exchangeCodeForToken(code, redirectUri)

    // Exchange for long-lived token (~60 days)
    const longToken = await getLongLivedToken(shortToken.access_token)

    // Get Meta user info
    const metaUser = await getMetaMe(longToken.access_token)

    // Get ad accounts and pick first active one
    const adAccounts = await getAdAccounts(longToken.access_token)
    const activeAccount = adAccounts.find(a => a.account_status === 1) ?? adAccounts[0]

    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days fallback

    await prisma.metaConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: longToken.access_token,
        metaUserId: metaUser.id,
        metaUserName: metaUser.name,
        selectedAdAccountId: activeAccount?.account_id,
        selectedAdAccountName: activeAccount?.name,
        currency: activeAccount?.currency,
        expiresAt,
      },
      update: {
        accessToken: longToken.access_token,
        metaUserId: metaUser.id,
        metaUserName: metaUser.name,
        selectedAdAccountId: activeAccount?.account_id,
        selectedAdAccountName: activeAccount?.name,
        currency: activeAccount?.currency,
        expiresAt,
      },
    })
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    const detail = err instanceof Error ? err.message.slice(0, 160) : 'unknown error'
    redirect(`/campaigns?error=token_exchange_failed&detail=${encodeURIComponent(detail)}`)
  }

  const response = new Response(null, {
    status: 302,
    headers: {
      Location: '/campaigns?connected=1',
      'Set-Cookie': 'meta_oauth_state=; Path=/; HttpOnly; Max-Age=0',
    },
  })
  return response
}

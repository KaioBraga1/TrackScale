/**
 * The public base URL of the app, e.g. "https://www.trackscaler.com".
 * Prefers NEXT_PUBLIC_APP_URL; falls back to the request's own host so OAuth
 * redirects and callbacks keep working even if the env var is missing or wrong.
 */
export function getAppBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (env) return env

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`

  return 'http://localhost:3000'
}

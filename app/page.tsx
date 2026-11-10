import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import LandingPage from './LandingPage'

export default async function HomePage() {
  // Only hit the DB when a session cookie is actually present — anonymous
  // visitors (the common case) skip auth entirely, so the landing never
  // depends on a live DB connection.
  const hasSession = cookies().getAll().some(c =>
    c.name.startsWith('authjs.session-token') || c.name.startsWith('__Secure-authjs.session-token')
  )

  if (hasSession) {
    try {
      const session = await auth()
      if (session?.user) redirect('/dashboard')
    } catch {
      // session check failed — show the landing page normally
    }
  }

  return <LandingPage />
}

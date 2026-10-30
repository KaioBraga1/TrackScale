import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import LandingPage from './LandingPage'

export default async function HomePage() {
  try {
    const session = await auth()
    if (session?.user) redirect('/dashboard')
  } catch {
    // session check failed — mostra landing page normalmente
  }
  return <LandingPage />
}

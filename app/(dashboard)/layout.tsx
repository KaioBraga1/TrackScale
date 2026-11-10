import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProfileDropdown from '@/components/ProfileDropdown'
import { cookies } from 'next/headers'

// ── Active nav items ──────────────────────────────────────────────────────────
const ACTIVE_MENU = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/campaigns',
    label: 'Campaigns',
    icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z',
  },
  {
    href: '/artists',
    label: 'Artists',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    href: '/tracking',
    label: 'Tracking',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
]

// ── Coming soon items ─────────────────────────────────────────────────────────
const SOON_MENU = [
  {
    href: '/fan-data',
    label: 'Fan Data',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    href: '/email',
    label: 'E-Mail',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    href: '/creatives',
    label: 'Creatives',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, membershipStatus: true },
  })

  const theme = cookies().get('ts-theme')?.value ?? 'dark'

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Ambient mesh */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(168,85,247,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(99,102,241,0.05) 0%, transparent 60%)',
        }}
      />

      {/* Navbar */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 select-none group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                boxShadow: '0 0 16px rgba(168,85,247,0.4)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              className="font-outfit font-bold text-base"
              style={{ letterSpacing: '-0.03em', color: 'var(--text)' }}
            >
              Track<span style={{ color: '#c084fc' }}>Scaler</span>
            </span>
          </Link>

          <ProfileDropdown
            name={user?.name ?? null}
            email={user?.email ?? session.user.email ?? null}
            plan={user?.membershipStatus ?? 'FREE'}
            signOutAction={handleSignOut}
            defaultTheme={theme}
          />
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 mx-auto grid max-w-7xl lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside
          className="px-3 py-3 lg:min-h-[calc(100vh-3.5rem)] lg:px-3 lg:py-6"
          style={{ borderRight: '1px solid var(--glass-border)' }}
        >
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Main navigation">

            {/* Active features */}
            {ACTIVE_MENU.map((item) => (
              <Link key={item.href} href={item.href} className="nav-item shrink-0 lg:shrink">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" strokeWidth="1.5" stroke="currentColor">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden lg:block">{item.label}</span>
                <span className="block lg:hidden text-xs">{item.label}</span>
              </Link>
            ))}

            {/* Divider */}
            <div
              className="hidden lg:block"
              style={{ height: 1, background: 'var(--glass-border)', margin: '10px 4px' }}
            />

            {/* Coming soon — desktop only to avoid mobile clutter */}
            {SOON_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item shrink-0 hidden lg:flex"
                style={{ opacity: 0.5 }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" strokeWidth="1.5" stroke="currentColor">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="flex-1">{item.label}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(168,85,247,0.1)', color: '#c084fc',
                  border: '1px solid rgba(168,85,247,0.2)',
                }}>
                  soon
                </span>
              </Link>
            ))}

          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

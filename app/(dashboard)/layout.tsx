import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'

const MAIN_MENU = [
  { href: '/dashboard',  label: 'Dashboard',  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/artists',    label: 'Artists',    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/fan-data',   label: 'Fan Data',   icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/email',      label: 'E-Mail',     icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { href: '/tracking',   label: 'Tracking',   icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { href: '/creatives',  label: 'Creatives',  icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/courses',    label: 'Courses',    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(13,13,20,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 select-none">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">
              Track<span style={{ color: 'var(--accent)' }}>Scale</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span
              className="hidden sm:block text-xs font-mono truncate max-w-[180px]"
              style={{ color: 'var(--muted)' }}
            >
              {session.user.email}
            </span>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button type="submit" className="btn-ghost text-xs px-3 py-1.5">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside
          className="px-3 py-3 lg:min-h-[calc(100vh-3.5rem)] lg:px-3 lg:py-5"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Main navigation">
            {MAIN_MENU.map((item) => (
              <Link key={item.href} href={item.href} className="nav-item shrink-0 lg:shrink">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" strokeWidth="1.5" stroke="currentColor">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="hidden lg:block">{item.label}</span>
                <span className="block lg:hidden text-xs">{item.label}</span>
              </Link>
            ))}

            <div className="hidden lg:block" style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />

            <Link href="/refer" className="nav-item shrink-0 text-xs" style={{ color: 'var(--accent)' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" strokeWidth="1.5" stroke="currentColor">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden lg:block">Refer &amp; Get 3 months</span>
            </Link>

            <div className="hidden lg:block" style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />

            <Link href="/settings" className="nav-item shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0" strokeWidth="1.5" stroke="currentColor">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden lg:block">Settings</span>
            </Link>
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

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  name: string | null
  email: string | null
  plan: string
  signOutAction: () => Promise<void>
  defaultTheme?: string
}

export default function ProfileDropdown({ name, email, plan, signOutAction, defaultTheme = 'dark' }: Props) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(defaultTheme)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = document.cookie.match(/ts-theme=([^;]+)/)?.[1] ?? defaultTheme
    setTheme(stored)
    document.documentElement.setAttribute('data-theme', stored)
  }, [defaultTheme])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    document.cookie = `ts-theme=${next}; path=/; max-age=31536000; SameSite=Lax`
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (email?.[0] ?? '?').toUpperCase()

  const isPro = plan !== 'FREE'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Profile menu"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          border: `2px solid ${open ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.3)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.01em',
          boxShadow: open ? '0 0 20px rgba(168,85,247,0.4)' : '0 0 10px rgba(168,85,247,0.2)',
          transition: 'all 0.15s ease', flexShrink: 0,
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          className="animate-fade-in-up"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 240, zIndex: 200,
            background: 'var(--card)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                {name && (
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6,
                background: isPro ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
                color: isPro ? '#c084fc' : 'var(--muted)',
                border: isPro ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--glass-border)',
              }}>
                {plan}
              </span>
              {!isPro && (
                <Link
                  href="/settings?tab=membership"
                  onClick={() => setOpen(false)}
                  style={{ fontSize: 10, color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}
                >
                  Upgrade →
                </Link>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            <DropdownItem href="/settings" onClick={() => setOpen(false)} icon={
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            }>
              Settings
            </DropdownItem>

            <DropdownItem href="/tracking" onClick={() => setOpen(false)} icon={
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            }>
              Tracking
            </DropdownItem>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '10px 14px', color: 'var(--text)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15, color: 'var(--muted)', flexShrink: 0 }}>
                  {theme === 'dark' ? (
                    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 110 10A5 5 0 0112 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
              {/* Toggle switch */}
              <div style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                background: theme === 'dark' ? '#a855f7' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s ease',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: theme === 'dark' ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
            </button>
          </div>

          {/* Sign out */}
          <div style={{ padding: '6px 8px 8px', borderTop: '1px solid var(--glass-border)' }}>
            <form action={signOutAction}>
              <button
                type="submit"
                style={{
                  width: '100%', padding: '9px 10px', borderRadius: 10, border: 'none',
                  background: 'rgba(239,68,68,0.06)', color: '#f87171',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
              >
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15, flexShrink: 0 }}>
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  href, onClick, icon, children,
}: {
  href: string; onClick: () => void; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', color: 'var(--text)', textDecoration: 'none',
        fontSize: 13, transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--glass-bg)')}
      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15, color: 'var(--muted)', flexShrink: 0 }}>
        {icon}
      </svg>
      {children}
    </Link>
  )
}

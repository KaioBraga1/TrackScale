'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} className="btn-primary gap-1.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
        </svg>
        Create
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && (
        <div
          className="animate-fade-in-up"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 268, zIndex: 100,
            background: 'var(--card)', border: '1px solid var(--glass-border)', borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            overflow: 'hidden', padding: 6,
          }}
        >
          <MenuItem
            onClick={() => go('/links/new')}
            color="#a855f7"
            title="Smart Link"
            desc="One link that routes fans to every platform"
            icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
          <MenuItem
            onClick={() => go('/campaigns')}
            color="#1877f2"
            title="Campaign"
            desc="Connect Meta Ads & track paid performance"
            icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
          />
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick, color, title, desc, icon,
}: {
  onClick: () => void; color: string; title: string; desc: string; icon: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', textAlign: 'left',
        padding: '11px 12px', borderRadius: 11, border: 'none', background: 'none', cursor: 'pointer',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 17, height: 17, color }}>
          <path d={icon} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 0', lineHeight: 1.4 }}>{desc}</p>
      </div>
    </button>
  )
}

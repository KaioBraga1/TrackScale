import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleLinkActive } from '../links/actions'
import CopyButton from '@/components/CopyButton'
import DeleteLinkButton from '@/components/DeleteLinkButton'
import CountUp from '@/components/motion/CountUp'
import CreateMenu from '@/components/CreateMenu'

export const metadata = { title: 'Dashboard' }

const PLATFORM_LABELS: Record<string, string> = {
  spotify:       'Spotify',
  apple_music:   'Apple Music',
  youtube_music: 'YouTube Music',
  deezer:        'Deezer',
}

const PLATFORM_COLORS: Record<string, string> = {
  spotify:       '#1db954',
  apple_music:   '#fc3c44',
  youtube_music: '#ff0000',
  deezer:        '#a238ff',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { spotify?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [links, realClicksRaw, realViewsRaw] = await Promise.all([
    prisma.link.findMany({
      where: { userId: session.user.id },
      include: { platforms: { orderBy: { name: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.click.groupBy({
      by: ['linkId'],
      where: {
        link: { userId: session.user.id },
        eventType: 'PLATFORM_CLICK',
        isFiltered: false,
        botScore: { lt: 0.5 },
      },
      _count: { id: true },
    }),
    prisma.click.groupBy({
      by: ['linkId'],
      where: {
        link: { userId: session.user.id },
        eventType: 'LINK_VIEW',
        isFiltered: false,
        botScore: { lt: 0.5 },
      },
      _count: { id: true },
    }),
  ])

  const clickMap = new Map(realClicksRaw.map((r) => [r.linkId, r._count.id]))
  const viewMap  = new Map(realViewsRaw.map((r)  => [r.linkId, r._count.id]))
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const totalLinks  = links.length
  const totalViews  = [...viewMap.values()].reduce((a, b) => a + b, 0)
  const totalClicks = [...clickMap.values()].reduce((a, b) => a + b, 0)
  const avgCtr      = totalViews ? Math.round((totalClicks / totalViews) * 1000) / 10 : 0

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {searchParams.spotify === 'connected' && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          Spotify connected successfully!
        </div>
      )}
      {searchParams.spotify === 'error' && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          Error connecting Spotify. Please try again.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Workspace</p>
          <h1
            className="font-outfit font-bold"
            style={{ fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text)' }}
          >
            Dashboard
          </h1>
        </div>
        <CreateMenu />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <GlassStatCard
          label="Smart Links"
          value={totalLinks}
          icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          color="#a855f7"
        />
        <GlassStatCard
          label="Real Views"
          value={totalViews}
          icon="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"
          color="#818cf8"
        />
        <GlassStatCard
          label="Platform Clicks"
          value={totalClicks}
          icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
          color="#34d399"
        />
        <GlassStatCard
          label="Avg Click Rate"
          value={avgCtr}
          suffix="%"
          decimals={1}
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          color="#f59e0b"
          accent
        />
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center gap-5 rounded-2xl"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(124,58,237,0.1) 100%)',
              border: '1px solid rgba(168,85,247,0.25)',
              boxShadow: '0 0 24px rgba(168,85,247,0.1)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" style={{ color: '#c084fc' }}>
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
              <path d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>No smart links yet</p>
            <p className="text-sm mt-1.5" style={{ color: 'var(--muted)' }}>Create your first link and start tracking real traffic.</p>
          </div>
          <Link href="/links/new" className="btn-primary mt-1">Create first link</Link>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {links.map((link) => {
            const realClicks = clickMap.get(link.id) ?? 0
            const views      = viewMap.get(link.id) ?? 0
            const ctr        = views ? Math.round((realClicks / views) * 1000) / 10 : 0
            const fullUrl    = `${appUrl}/${link.slug}`

            return (
              <div
                key={link.id}
                className="card-hover flex flex-col sm:flex-row gap-4"
                style={{ opacity: link.isActive ? 1 : 0.5 }}
              >
                {/* Cover */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}
                >
                  {link.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ color: 'var(--muted)' }}>
                        <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{link.title}</p>
                      <p className="text-sm truncate mt-0.5" style={{ color: 'var(--muted)' }}>{link.artist}</p>
                    </div>
                    <span className={link.isActive ? 'badge-success' : 'badge-muted'}>
                      {link.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs truncate" style={{ color: 'var(--muted)' }}>/{link.slug}</span>
                    <CopyButton text={fullUrl} />
                  </div>

                  {/* Platforms */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {link.platforms.filter((p) => p.isActive).map((p) => (
                      <span
                        key={p.name}
                        className="badge-muted text-xs"
                        style={{ borderColor: `${PLATFORM_COLORS[p.name] ?? '#888'}30` }}
                      >
                        {PLATFORM_LABELS[p.name] ?? p.name}
                      </span>
                    ))}
                  </div>

                  {/* Stats + Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {/* Mini stat chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(129,140,248,0.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.15)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        <CountUp value={views} />&nbsp;views
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                          <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <CountUp value={realClicks} />&nbsp;clicks
                      </span>
                      {ctr > 0 && (
                        <span
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}
                        >
                          {ctr}% CTR
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                      <Link href={`/links/${link.id}`} className="btn-secondary text-xs px-3 py-1.5">
                        Stats
                      </Link>
                      <Link href={`/links/${link.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">
                        Edit
                      </Link>
                      <form action={toggleLinkActive.bind(null, link.id, !link.isActive)}>
                        <button type="submit" className="btn-ghost text-xs px-3 py-1.5">
                          {link.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                      <DeleteLinkButton id={link.id} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GlassStatCard({
  label,
  value,
  suffix = '',
  decimals = 0,
  icon,
  color,
  accent = false,
}: {
  label: string
  value: number
  suffix?: string
  decimals?: number
  icon: string
  color: string
  accent?: boolean
}) {
  return (
    <div
      className="lift-card rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${color}18`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 24px ${color}08, 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top highlight */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
        }}
      />
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute', top: -30, right: -20, width: 100, height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" style={{ color, width: 18, height: 18 }}>
          <path d={icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <CountUp
        value={value}
        suffix={suffix}
        decimals={decimals}
        className="font-outfit font-bold"
        style={{ fontSize: 26, letterSpacing: '-0.03em', color: accent ? color : 'var(--text)', lineHeight: 1, display: 'inline-block' }}
      />
      <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}

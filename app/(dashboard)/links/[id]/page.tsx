import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CopyButton from '@/components/CopyButton'
import PixelTestButton from '@/components/PixelTestButton'
import VisitorsTable from '@/components/VisitorsTable'
import AnalyticsVisualizations from '@/components/AnalyticsVisualizations'
import PlaylistFollowersSync from '@/components/PlaylistFollowersSync'
import ShareButton from '@/components/ShareButton'
import {
  getAccountInsights, getCampaigns,
  fmtMoney, fmtNum, fmtPct, getActionValue,
  OBJECTIVE_LABELS,
  type MetaInsights, type MetaCampaign,
} from '@/lib/meta'

type Period = 'today' | '7d' | '28d'
type AnalyticsMode = 'consent' | 'total'

const PERIODS: Record<Period, number> = { today: 1, '7d': 7, '28d': 28 }
const META_PRESET: Record<Period, string> = { today: 'today', '7d': 'last_7d', '28d': 'last_30d' }
const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify', apple_music: 'Apple Music', youtube_music: 'YouTube Music', deezer: 'Deezer',
}

export const metadata = { title: 'Link Stats' }

// ─── Link Journey ──────────────────────────────────────────────────────────────

function LinkJourney({ views, clicks, createdAt }: { views: number; clicks: number; createdAt: Date }) {
  const daysOld = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  const stages = [
    { label: 'Live', met: true },
    { label: 'First visitors', met: views > 0 },
    { label: 'Converting', met: clicks > 0 },
    { label: 'Growing', met: views >= 100 && clicks > 0 },
    { label: 'Established', met: daysOld >= 14 && views >= 500 },
  ]
  const currentIdx = stages.reduce((last, s, i) => s.met ? i : last, 0)
  const pct = (currentIdx / (stages.length - 1)) * 100

  return (
    <div className="card" style={{ padding: '14px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Link Journey</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#c084fc' }}>{stages[currentIdx].label}</span>
      </div>
      <div style={{ position: 'relative', margin: '0 0 14px' }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, height: 3, width: `${pct}%`, background: 'linear-gradient(90deg, #7c3aed, #34d399)', borderRadius: 2 }} />
        {stages.map((s, i) => {
          const leftPct = (i / (stages.length - 1)) * 100
          const done = i < currentIdx; const active = i === currentIdx
          return (
            <div key={s.label} style={{
              position: 'absolute', left: `${leftPct}%`, top: '50%', transform: 'translate(-50%, -50%)',
              width: active ? 12 : 9, height: active ? 12 : 9, borderRadius: '50%', zIndex: 1,
              background: active ? '#a855f7' : done ? '#34d399' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${active ? '#c084fc' : done ? '#34d39960' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: active ? '0 0 10px #a855f780' : 'none',
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {stages.map((s, i) => {
          const active = i === currentIdx; const done = i < currentIdx
          return (
            <span key={s.label} style={{
              fontSize: 10, fontWeight: active ? 700 : 400, flex: 1,
              textAlign: i === 0 ? 'left' : i === stages.length - 1 ? 'right' : 'center',
              color: active ? '#c084fc' : done ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
            }}>{s.label}</span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Meta metric card ─────────────────────────────────────────────────────────

function MCard({ label, value, sub, color = '#a855f7', icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string
}) {
  return (
    <div className="lift-card" style={{
      borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.02) 100%)`,
      border: `1px solid ${color}18`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}25, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 12, height: 12, color }}>
            <path d={icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

// ─── Funnel row ───────────────────────────────────────────────────────────────

function FunnelRow({ label, value, max, color, sub, display }: {
  label: string; value: number; max: number; color: string; sub?: string; display?: string
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
        {sub && <div style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.7 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <span style={{ width: 70, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
        {display ?? (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString())}
      </span>
    </div>
  )
}

// ─── Campaign row ─────────────────────────────────────────────────────────────

function CampStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 48 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, color: 'var(--muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default async function LinkStatsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { mode?: string; period?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const link = await prisma.link.findUnique({
    where: { id: params.id },
    include: {
      platforms: { orderBy: { order: 'asc' } },
      pixels: { select: { pixel: { select: { metaPixelId: true } } } },
      user: { select: { timezone: true } },
    },
  })
  if (!link || link.userId !== session.user.id) notFound()

  const user = link.user

  // Detect all pixel IDs on this link
  const pixelIds = [
    ...(link.metaPixelId ? [link.metaPixelId] : []),
    ...link.pixels.map(p => p.pixel.metaPixelId),
  ].filter((v, i, a) => a.indexOf(v) === i)
  const hasPixel = pixelIds.length > 0

  const timezone = user?.timezone || 'UTC'
  const mode: AnalyticsMode = searchParams.mode === 'consent' ? 'consent' : 'total'
  const period: Period = searchParams.period === 'today' || searchParams.period === '7d' ? searchParams.period : '28d'
  const todayKey = getLocalDateKey(new Date(), timezone)
  const startKey = shiftDateKey(todayKey, -(PERIODS[period] - 1))
  const start = localMidnightUtc(startKey, timezone)

  const clickWhere = {
    linkId: link.id, createdAt: { gte: start }, isFiltered: false, botScore: { lt: 0.5 },
    ...(mode === 'consent' ? { consentGranted: true } : {}),
  }
  const visitorWhere = {
    linkId: link.id, createdAt: { gte: start },
    clicks: {
      some: {
        eventType: 'LINK_VIEW', createdAt: { gte: start }, isFiltered: false, botScore: { lt: 0.5 },
        ...(mode === 'consent' ? { consentGranted: true } : {}),
      },
    },
    ...(mode === 'consent' ? { consentStatus: 'GRANTED' as const } : {}),
  }

  const [views, clicks, botCount, platformStats, visitors, dailyRows, followerSnapshots, visitorGeoRaw, metaConn] = await Promise.all([
    prisma.click.count({ where: { ...clickWhere, eventType: 'LINK_VIEW' } }),
    prisma.click.count({ where: { ...clickWhere, eventType: 'PLATFORM_CLICK' } }),
    prisma.click.count({ where: { linkId: link.id, createdAt: { gte: start }, isFiltered: true } }),
    prisma.click.groupBy({ by: ['platform'], where: { ...clickWhere, eventType: 'PLATFORM_CLICK' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.visitor.findMany({
      where: visitorWhere, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, country: true, city: true, device: true, browser: true, consentStatus: true, createdAt: true, botScore: true },
    }),
    mode === 'consent'
      ? prisma.$queryRaw<Array<{ day: Date | string; eventType: string; total: bigint }>>`
          SELECT ("createdAt" AT TIME ZONE ${timezone})::date AS day, "eventType", COUNT(*)::bigint AS total
          FROM "Click" WHERE "linkId" = ${link.id} AND "createdAt" >= ${start}
            AND "isFiltered" = false AND "botScore" < 0.5 AND "consentGranted" = true
          GROUP BY 1, 2 ORDER BY 1 ASC`
      : prisma.$queryRaw<Array<{ day: Date | string; eventType: string; total: bigint }>>`
          SELECT ("createdAt" AT TIME ZONE ${timezone})::date AS day, "eventType", COUNT(*)::bigint AS total
          FROM "Click" WHERE "linkId" = ${link.id} AND "createdAt" >= ${start}
            AND "isFiltered" = false AND "botScore" < 0.5
          GROUP BY 1, 2 ORDER BY 1 ASC`,
    prisma.playlistFollowerSnapshot.findMany({ where: { linkId: link.id }, orderBy: { snapshotDate: 'asc' }, select: { snapshotDate: true, followers: true } }),
    prisma.visitor.findMany({
      where: visitorWhere,
      select: {
        country: true, latitude: true, longitude: true, referrer: true, utmSource: true,
        clicks: {
          where: { createdAt: { gte: start }, isFiltered: false, botScore: { lt: 0.5 }, ...(mode === 'consent' ? { consentGranted: true } : {}) },
          select: { eventType: true, platform: true },
        },
      },
    }),
    prisma.metaConnection.findUnique({ where: { userId: session.user.id } }),
  ])

  // Build daily data
  const days = Array.from({ length: PERIODS[period] }, (_, index) => ({ day: shiftDateKey(startKey, index), views: 0, clicks: 0 }))
  const dailyMap = new Map(days.map(d => [d.day, d]))
  for (const row of dailyRows) {
    const rowDay = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10)
    const d = dailyMap.get(rowDay)
    if (!d) continue
    if (row.eventType === 'LINK_VIEW') d.views = Number(row.total)
    if (row.eventType === 'PLATFORM_CLICK') d.clicks = Number(row.total)
  }

  // Build geo + source data
  const geographic = new Map<string, { visits: number; clicks: number; latitudes: number[]; longitudes: number[]; platforms: Map<string, number> }>()
  const sourceStats = new Map<string, { visits: number; clicks: number }>()
  for (const visitor of visitorGeoRaw) {
    const countryName = visitor.country ?? 'Unknown'
    const country = geographic.get(countryName) ?? { visits: 0, clicks: 0, latitudes: [], longitudes: [], platforms: new Map<string, number>() }
    if (visitor.latitude !== null) country.latitudes.push(visitor.latitude)
    if (visitor.longitude !== null) country.longitudes.push(visitor.longitude)
    const sourceName = classifySource(visitor.utmSource, visitor.referrer)
    const source = sourceStats.get(sourceName) ?? { visits: 0, clicks: 0 }
    // Count VIEWS (page-view events) and CLICKS (platform-click events) consistently,
    // so CTR = clicks / views is meaningful (not "visitor count" vs "event count").
    for (const click of visitor.clicks) {
      if (click.eventType === 'LINK_VIEW') {
        country.visits += 1; source.visits += 1
      } else if (click.eventType === 'PLATFORM_CLICK') {
        country.clicks += 1; source.clicks += 1
        const platform = click.platform ?? 'unknown'
        country.platforms.set(platform, (country.platforms.get(platform) ?? 0) + 1)
      }
    }
    geographic.set(countryName, country)
    sourceStats.set(sourceName, source)
  }
  const countryRows = [...geographic.entries()].map(([country, stats]) => ({
    country, visits: stats.visits, clicks: stats.clicks,
    latitude: stats.latitudes.length ? stats.latitudes.reduce((s, v) => s + v, 0) / stats.latitudes.length : null,
    longitude: stats.longitudes.length ? stats.longitudes.reduce((s, v) => s + v, 0) / stats.longitudes.length : null,
    platforms: [...stats.platforms.entries()].map(([platform, count]) => ({ platform: PLATFORM_LABELS[platform] ?? platform, count })).sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.visits - a.visits)
  const sourceRows = [...sourceStats.entries()].map(([source, stats]) => ({ source, ...stats })).sort((a, b) => b.visits - a.visits)

  // Fetch Meta data if link has pixel + user has connection
  let metaInsights: MetaInsights | null = null
  let metaCampaigns: MetaCampaign[] = []
  let metaError: string | null = null

  if (hasPixel && metaConn?.selectedAdAccountId) {
    try {
      ;[metaInsights, metaCampaigns] = await Promise.all([
        getAccountInsights(metaConn.accessToken, metaConn.selectedAdAccountId, META_PRESET[period] as Parameters<typeof getAccountInsights>[2]),
        getCampaigns(metaConn.accessToken, metaConn.selectedAdAccountId, META_PRESET[period] as Parameters<typeof getCampaigns>[2]),
      ])
    } catch (err) {
      metaError = err instanceof Error ? err.message : 'Meta API error'
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fullUrl = `${appUrl}/${link.slug}`
  const baseQuery = new URLSearchParams({ mode, period }).toString()
  const currency = metaConn?.currency ?? 'USD'
  const spend = parseFloat(metaInsights?.spend ?? '0') || 0
  const metaClicks = parseInt(metaInsights?.clicks ?? '0') || 0
  const metaImpressions = parseInt(metaInsights?.impressions ?? '0') || 0
  const arrivalRate = metaClicks > 0 ? Math.round((views / metaClicks) * 100) : null

  const followerData = followerSnapshots.map(s => ({
    date: s.snapshotDate instanceof Date ? s.snapshotDate.toISOString().slice(0, 10) : String(s.snapshotDate).slice(0, 10),
    followers: s.followers,
  }))

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className="text-sm" style={{ color: 'var(--muted)' }}>← Dashboard</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{link.title}</span>
        {link.artist && <span className="text-sm" style={{ color: 'var(--muted)' }}>· {link.artist}</span>}
      </div>

      {/* Link header */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex gap-5 items-start flex-wrap">
          <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            {link.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" style={{ color: 'var(--muted)' }}><path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>{link.title}</p>
                {link.artist && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{link.artist}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={link.isActive ? 'badge-success' : 'badge-muted'}>{link.isActive ? 'Active' : 'Inactive'}</span>
                {hasPixel && <span className="badge-accent" style={{ fontSize: 10 }}>Pixel ✓</span>}
                <Link href={`/links/${link.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">Edit</Link>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-mono text-xs truncate" style={{ color: 'var(--muted)' }}>{fullUrl}</span>
              <CopyButton text={fullUrl} />
              <ShareButton url={fullUrl} />
              <a href={`/api/links/${link.id}/export?${baseQuery}`} className="btn-ghost text-xs px-2.5 py-1 rounded-lg" style={{ fontSize: 11 }}>Export CSV</a>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {link.platforms.filter(p => p.isActive).map(p => (
                <span key={p.name} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', border: '1px solid var(--glass-border)' }}>
                  {PLATFORM_LABELS[p.name] ?? p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Link Journey */}
      <LinkJourney views={views} clicks={clicks} createdAt={link.createdAt} />

      {/* Period + mode */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg p-1 w-fit" style={{ border: '1px solid var(--glass-border)' }} aria-label="Analytics mode">
          <FilterLink id={link.id} mode="consent" period={period} selected={mode === 'consent'}>Consent</FilterLink>
          <FilterLink id={link.id} mode="total" period={period} selected={mode === 'total'}>Total</FilterLink>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7d', '28d'] as const).map(value => (
            <FilterLink key={value} id={link.id} mode={mode} period={value} selected={period === value}>
              {value === 'today' ? 'Today' : value === '7d' ? 'Last 7 days' : 'Last 28 days'}
            </FilterLink>
          ))}
        </div>
      </section>

      {/* ── META PERFORMANCE (only if pixel connected) ── */}
      {hasPixel && (
        <>
          {/* Has pixel + Meta connected → show data */}
          {metaConn?.selectedAdAccountId && !metaError && metaInsights && (
            <div className="space-y-4">
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="white" style={{ width: 12, height: 12 }}>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Meta Ads Performance</span>
                  {metaConn.selectedAdAccountName && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {metaConn.selectedAdAccountName}</span>}
                </div>
                <Link href="/campaigns" style={{ fontSize: 11, color: '#c084fc', textDecoration: 'none' }}>All campaigns →</Link>
              </div>

              {/* Meta metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger-children">
                <MCard label="Spend" value={fmtMoney(metaInsights.spend, currency)} sub={`${fmtNum(metaInsights.reach)} reach`} color="#f87171" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <MCard label="Impressions" value={fmtNum(metaInsights.impressions)} sub={metaInsights.frequency ? `${parseFloat(metaInsights.frequency).toFixed(1)}x freq` : undefined} color="#818cf8" icon="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
                <MCard label="Clicks" value={fmtNum(metaInsights.clicks)} sub={`${fmtPct(metaInsights.ctr)} CTR`} color="#34d399" icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                <MCard label="CPC" value={fmtMoney(metaInsights.cpc, currency)} sub={`${fmtMoney(metaInsights.cpp, currency)} CPM`} color="#f59e0b" icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                {(() => {
                  const leads = getActionValue(metaInsights.actions, 'lead') || getActionValue(metaInsights.actions, 'onsite_conversion.lead_grouped')
                  const saves = getActionValue(metaInsights.actions, 'post_save') || getActionValue(metaInsights.actions, 'onsite_conversion.save_to_collection')
                  return (
                    <>
                      {leads > 0 && <MCard label="Leads" value={fmtNum(leads)} sub={`${fmtMoney(spend / leads, currency)} CPL`} color="#c084fc" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
                      {saves > 0 && <MCard label="Saves" value={fmtNum(saves)} color="#38bdf8" icon="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />}
                    </>
                  )
                })()}
                <MCard label="Bots Filtered" value={fmtNum(botCount)} color="#f59e0b" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </div>

              {/* Traffic funnel */}
              {metaImpressions > 0 && (
                <div style={{ borderRadius: 16, padding: '18px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Traffic Funnel</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <FunnelRow label="Impressions" value={metaImpressions} max={metaImpressions} color="#818cf8" />
                    <FunnelRow label="Meta Clicks" value={metaClicks} max={metaImpressions} color="#34d399" sub={`${fmtPct(metaInsights.ctr)} CTR`} />
                    <FunnelRow label="Smart Link Views" value={views} max={metaImpressions} color="#a855f7" sub={arrivalRate != null ? `${arrivalRate}% arrival` : undefined} />
                    {botCount > 0 && <FunnelRow label="Bots Blocked" value={botCount} max={metaImpressions} color="#f59e0b" />}
                    <FunnelRow label="Platform Clicks" value={clicks} max={metaImpressions} color="#38bdf8" sub={views > 0 ? `${Math.round((clicks / views) * 100)}% CVR` : undefined} />
                    {spend > 0 && views > 0 && <FunnelRow label="Cost / View" value={0} max={1} color="#c084fc" display={fmtMoney(spend / views, currency)} />}
                    {spend > 0 && clicks > 0 && <FunnelRow label="Cost / Click" value={0} max={1} color="#f87171" display={fmtMoney(spend / clicks, currency)} />}
                  </div>
                </div>
              )}

              {/* Campaign breakdown */}
              {metaCampaigns.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED').length > 0 && (
                <div style={{ borderRadius: 16, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Campaigns</span>
                  </div>
                  {metaCampaigns.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED').map((camp, i, arr) => {
                    const ins = camp.insights?.data?.[0]
                    const isActive = camp.status === 'ACTIVE'
                    return (
                      <div key={camp.id} style={{ padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--glass-border)' : 'none', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#34d399' : '#f59e0b', boxShadow: isActive ? '0 0 6px #34d399' : 'none', flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: isActive ? '#34d399' : '#f59e0b', fontWeight: 600 }}>{camp.status}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--glass-bg)', padding: '0 5px', borderRadius: 3 }}>{OBJECTIVE_LABELS[camp.objective] ?? camp.objective}</span>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{camp.name}</p>
                          {camp.daily_budget && <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{fmtMoney(parseInt(camp.daily_budget) / 100, currency)}/day</p>}
                        </div>
                        {ins ? (
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <CampStat label="Spend" value={fmtMoney(ins.spend, currency)} color="#f87171" />
                            <CampStat label="Impr." value={fmtNum(ins.impressions)} color="#818cf8" />
                            <CampStat label="Clicks" value={fmtNum(ins.clicks)} color="#34d399" />
                            <CampStat label="CPC" value={fmtMoney(ins.cpc, currency)} color="#f59e0b" />
                            <CampStat label="CTR" value={fmtPct(ins.ctr)} color="#c084fc" />
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>No data this period</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Has pixel + Meta connected but error */}
          {metaConn?.selectedAdAccountId && metaError && (
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
              Meta error: {metaError} — <a href="/api/auth/meta" style={{ color: '#fca5a5', textDecoration: 'underline' }}>Reconnect Meta</a>
            </div>
          )}

          {/* Has pixel but Meta NOT connected → CTA */}
          {!metaConn && (
            <div style={{ borderRadius: 16, padding: '20px 24px', background: 'linear-gradient(135deg, rgba(24,119,242,0.06), rgba(24,119,242,0.02))', border: '1px solid rgba(24,119,242,0.15)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Pixel detected — connect Meta Ads for full analytics</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  This link has a Meta pixel. Connect your Ads account to see CPC, CPL, Spend, Impressions, ROI and the complete paid → organic funnel.
                </p>
              </div>
              <a href="/api/auth/meta" className="btn-primary gap-2 text-sm" style={{ flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Connect Meta Ads
              </a>
            </div>
          )}

          {/* Pixel IDs info (collapsed) */}
          <details style={{ fontSize: 11, color: 'var(--muted)' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Pixel IDs on this link ({pixelIds.length})</summary>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {pixelIds.map(id => (
                <span key={id} style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  {id}
                  <PixelTestButton pixelId={id} />
                </span>
              ))}
            </div>
          </details>
        </>
      )}

      {/* No pixel — CTA to add one */}
      {!hasPixel && (
        <div style={{ borderRadius: 14, padding: '14px 18px', background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, flex: 1 }}>
            Add a Meta pixel to this link to unlock paid traffic analytics (CPC, CPL, ROI, impressions, funnel).
          </p>
          <Link href={`/links/${link.id}/edit`} className="btn-secondary text-xs px-3 py-1.5">Add Pixel</Link>
        </div>
      )}

      {/* Organic Analytics */}
      <AnalyticsVisualizations
        linkId={link.id}
        period={period}
        daily={days}
        platforms={platformStats.map(item => ({
          name: PLATFORM_LABELS[item.platform ?? ''] ?? item.platform ?? 'Unknown',
          count: item._count.id,
        }))}
        countries={countryRows}
        sources={sourceRows}
        views={views}
        clicks={clicks}
        mode={mode}
        followerSnapshots={followerData}
      />

      {/* Spotify sync */}
      {link.spotifyPlaylistId && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">Spotify Playlist Followers</p>
            <p className="text-xs text-muted mt-0.5">Synced daily at 06:00 UTC.</p>
          </div>
          <PlaylistFollowersSync linkId={link.id} />
        </div>
      )}

      {/* Visitors table */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-sm">Recent visitors</h2>
        {visitors.length
          ? <VisitorsTable visitors={visitors.map(v => ({ ...v, createdAt: v.createdAt.toISOString() }))} />
          : <p className="text-sm text-muted">No visitors in the selected period.</p>
        }
      </div>

      <p className="text-[11px] text-muted">Timezone: {timezone}. Consent = approved only; Total = all unfiltered traffic.</p>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FilterLink({ id, mode, period, selected, children }: {
  id: string; mode: AnalyticsMode; period: Period; selected: boolean; children: React.ReactNode
}) {
  return (
    <Link
      href={`/links/${id}?${new URLSearchParams({ mode, period })}`}
      aria-current={selected ? 'page' : undefined}
      className={`rounded-md px-3 py-1.5 text-xs transition-colors ${selected ? 'bg-accent text-white' : 'text-muted hover:text-white hover:bg-card'}`}
    >
      {children}
    </Link>
  )
}

function classifySource(utmSource: string | null, referrer: string | null): string {
  const src = (utmSource ?? '').toLowerCase().trim()
  const ref = (referrer ?? '').toLowerCase().trim()
  if (src) {
    if (src === 'ig' || src.includes('instagram')) return 'Instagram'
    if (src === 'fb' || src === 'facebook' || src.includes('facebook')) return 'Facebook'
    if (src === 'google' || src.includes('google')) return 'Google'
    if (src === 'tiktok' || src.includes('tiktok')) return 'TikTok'
    if (src === 'twitter' || src === 'x' || src === 'x.com') return 'X / Twitter'
    if (src === 'youtube' || src.includes('youtube')) return 'YouTube'
    if (src === 'direct') return 'Direct'
    return src.charAt(0).toUpperCase() + src.slice(1)
  }
  if (ref) {
    // Referrer that is the smart link's own domain = the visitor opened it directly
    // (typed, bookmark, messaging app, or same-site navigation) → Direct.
    if (ref.includes('trackscaler.com') || ref.includes('track-scale-r8j6.vercel.app') || ref.includes('localhost')) return 'Direct'
    if (ref.includes('instagram.com') || ref.includes('l.instagram.com')) return 'Instagram'
    if (ref.includes('facebook.com') || ref.includes('l.facebook.com') || ref.includes('fb.gg')) return 'Facebook'
    if (ref.includes('google.')) return 'Google'
    if (ref.includes('tiktok.com')) return 'TikTok'
    if (ref.includes('twitter.com') || ref.includes('t.co') || ref.includes('x.com')) return 'X / Twitter'
    if (ref.includes('youtube.com') || ref.includes('youtu.be')) return 'YouTube'
    try {
      const host = new URL(ref.startsWith('http') ? ref : `https://${ref}`).hostname.replace(/^www\./, '')
      return host || 'Other'
    } catch { return 'Other' }
  }
  return 'Direct'
}

function getLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return `${v.year}-${v.month}-${v.day}`
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function localMidnightUtc(dateKey: string, timezone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  let instant = target
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  for (let i = 0; i < 3; i++) {
    const v = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]))
    const localAsUtc = Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day), Number(v.hour), Number(v.minute), Number(v.second))
    instant += target - localAsUtc
  }
  return new Date(instant)
}

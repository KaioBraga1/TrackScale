'use client'

import { useState } from 'react'

interface DailyPoint {
  day: string
  views: number
  clicks: number
}

interface CountryRow {
  country: string
  visits: number
  clicks: number
  latitude: number | null
  longitude: number | null
  platforms: Array<{ platform: string; count: number }>
}

interface FollowerPoint {
  date: string
  followers: number
}

interface Props {
  linkId: string
  period: 'today' | '7d' | '28d'
  daily: DailyPoint[]
  platforms: Array<{ name: string; count: number }>
  countries: CountryRow[]
  sources: Array<{ source: string; visits: number; clicks: number }>
  views: number
  clicks: number
  mode: 'consent' | 'total'
  followerSnapshots?: FollowerPoint[]
}

type Metric = 'views' | 'clicks' | 'ctr' | 'followers'
type BreakdownTab = 'sources' | 'countries' | 'platforms'

const SOURCE_COLORS: Record<string, string> = {
  Instagram: '#e1306c',
  Facebook: '#1877f2',
  Google: '#4285f4',
  TikTok: '#ff0050',
  YouTube: '#ff0000',
  'X / Twitter': '#1d9bf0',
  Direct: '#a855f7',
}

const PLATFORM_COLORS: Record<string, string> = {
  Spotify: '#1db954',
  'Apple Music': '#fc3c44',
  'YouTube Music': '#ff0000',
  Deezer: '#a238ff',
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) return `${(v / 1_000).toFixed(0)}K`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

function dateLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ─── Bar chart ───────────────────────────────────────────────────────────────

function BarChart({ daily, metric }: { daily: DailyPoint[]; metric: 'views' | 'clicks' }) {
  const color = metric === 'views' ? '#a855f7' : '#34d399'
  const values = daily.map(d => metric === 'views' ? d.views : d.clicks)
  const maxV = Math.max(1, ...values)

  const W = 760
  const H = 180
  const PL = 42
  const PR = 8
  const PT = 10
  const PB = 28
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const slotW = chartW / Math.max(daily.length, 1)
  const barW = Math.min(slotW * 0.65, 32)

  function bx(i: number) { return PL + i * slotW + (slotW - barW) / 2 }
  function bh(v: number) { return Math.max(2, (v / maxV) * chartH) }
  function by(v: number) { return PT + chartH - bh(v) }

  const gridLevels = [0.75, 0.5, 0.25]
  const labelStep = daily.length <= 7 ? 1 : daily.length <= 14 ? 2 : 7

  return (
    <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300, height: 180, display: 'block' }}>
        {/* Grid lines */}
        {gridLevels.map((p, i) => {
          const y = PT + chartH * (1 - p)
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9.5" fontFamily="system-ui,-apple-system,sans-serif">
                {fmtAxis(maxV * p)}
              </text>
            </g>
          )
        })}
        {/* Baseline */}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Bars */}
        {daily.map((d, i) => {
          const v = metric === 'views' ? d.views : d.clicks
          return (
            <g key={d.day}>
              <rect
                className="chart-bar"
                style={{ animationDelay: `${i * 22}ms` }}
                x={bx(i)} y={by(v)} width={barW} height={bh(v)}
                rx={Math.min(4, barW / 3)}
                fill={v > 0 ? color : 'rgba(255,255,255,0.04)'}
                opacity={v > 0 ? 0.9 : 1}
              />
              <title>{`${dateLabel(d.day)}: ${v.toLocaleString('en-US')}`}</title>
            </g>
          )
        })}

        {/* X-axis labels */}
        {daily.map((d, i) => {
          if (i % labelStep !== 0 && i !== daily.length - 1) return null
          return (
            <text key={d.day} x={bx(i) + barW / 2} y={H - 7} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="9.5" fontFamily="system-ui,-apple-system,sans-serif">
              {dateLabel(d.day)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── CTR line chart ───────────────────────────────────────────────────────────

function CTRLineChart({ daily }: { daily: DailyPoint[] }) {
  const values = daily.map(d => d.views > 0 ? (d.clicks / d.views) * 100 : 0)
  const maxV = Math.max(1, ...values)

  const W = 760
  const H = 180
  const PL = 42
  const PR = 8
  const PT = 10
  const PB = 28
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const slotW = chartW / Math.max(daily.length - 1, 1)
  function px(i: number) { return PL + i * slotW }
  function py(v: number) { return PT + chartH - (v / maxV) * chartH }

  const linePts = values.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  const areaPts = `${px(0)},${PT + chartH} ${linePts} ${px(daily.length - 1)},${PT + chartH}`

  const gridLevels = [0.75, 0.5, 0.25]
  const labelStep = daily.length <= 7 ? 1 : 7

  return (
    <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300, height: 180, display: 'block' }}>
        <defs>
          <linearGradient id="ctrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLevels.map((p, i) => {
          const y = PT + chartH * (1 - p)
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9.5" fontFamily="system-ui">
                {`${(maxV * p).toFixed(1)}%`}
              </text>
            </g>
          )
        })}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <polygon className="chart-area" points={areaPts} fill="url(#ctrGrad)" />
        <polyline className="chart-line" style={{ ['--path-len' as string]: 1800 } as React.CSSProperties} points={linePts} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => v > 0 && (
          <circle key={i} cx={px(i)} cy={py(v)} r="3.5" fill="#f59e0b" stroke="rgba(5,5,10,0.8)" strokeWidth="1.5">
            <title>{`${dateLabel(daily[i].day)}: ${v.toFixed(1)}%`}</title>
          </circle>
        ))}
        {daily.map((d, i) => {
          if (i % labelStep !== 0 && i !== daily.length - 1) return null
          return (
            <text key={d.day} x={px(i)} y={H - 7} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="9.5" fontFamily="system-ui">
              {dateLabel(d.day)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Follower line chart ──────────────────────────────────────────────────────

function FollowerLineChart({ snapshots }: { snapshots: FollowerPoint[] }) {
  if (snapshots.length === 0) {
    return <EmptyState text="No follower data available. Connect Spotify and sync a playlist to track growth." />
  }

  const values = snapshots.map(s => s.followers)
  const maxV = Math.max(1, ...values)
  const minV = Math.min(...values)
  const range = Math.max(1, maxV - minV)

  const W = 760
  const H = 180
  const PL = 54
  const PR = 8
  const PT = 10
  const PB = 28
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const slotW = chartW / Math.max(snapshots.length - 1, 1)
  function px(i: number) { return PL + i * slotW }
  function py(v: number) { return PT + chartH - ((v - minV) / range) * chartH }

  const linePts = values.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  const areaPts = `${px(0)},${PT + chartH} ${linePts} ${px(snapshots.length - 1)},${PT + chartH}`
  const labelStep = Math.max(1, Math.floor(snapshots.length / 4))

  return (
    <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 300, height: 180, display: 'block' }}>
        <defs>
          <linearGradient id="follGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.75, 0.5, 0.25].map((p, i) => {
          const v = minV + range * p
          const y = PT + chartH * (1 - p)
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9.5" fontFamily="system-ui">
                {fmt(Math.round(v))}
              </text>
            </g>
          )
        })}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <polygon className="chart-area" points={areaPts} fill="url(#follGrad)" />
        <polyline className="chart-line" style={{ ['--path-len' as string]: 1800 } as React.CSSProperties} points={linePts} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {snapshots.length > 0 && (
          <circle cx={px(snapshots.length - 1)} cy={py(values[values.length - 1])} r="4.5" fill="#38bdf8" stroke="rgba(5,5,10,0.8)" strokeWidth="2">
            <title>{`${snapshots[snapshots.length - 1].date}: ${values[values.length - 1].toLocaleString('en-US')} followers`}</title>
          </circle>
        )}
        {snapshots.map((s, i) => {
          if (i % labelStep !== 0 && i !== snapshots.length - 1) return null
          return (
            <text key={s.date} x={px(i)} y={H - 7} textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="9.5" fontFamily="system-ui">
              {dateLabel(s.date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subLabel, color, selected, onClick,
}: {
  label: string
  value: string | number
  subLabel?: string
  color: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: selected ? `${color}0d` : 'rgba(255,255,255,0.025)',
        border: selected ? `1.5px solid ${color}50` : '1.5px solid rgba(255,255,255,0.06)',
        boxShadow: selected ? `0 0 24px ${color}18, inset 0 1px 0 ${color}25` : 'none',
        width: '100%',
      }}
    >
      <p style={{
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: selected ? color : 'rgba(255,255,255,0.35)',
        marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
        color: selected ? color : 'var(--text)',
      }}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      {subLabel && (
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{subLabel}</p>
      )}
    </button>
  )
}

// ─── Breakdown helpers ────────────────────────────────────────────────────────

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}80)`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>{text}</p>
}

function SourcesTab({ sources, views, clicks }: {
  sources: Array<{ source: string; visits: number; clicks: number }>
  views: number
  clicks: number
}) {
  if (!sources.length) return <EmptyState text="No traffic source data for this period." />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sources.map(s => {
        const visitPct = views ? Math.round((s.visits / views) * 100) : 0
        const clickPct = clicks ? Math.round((s.clicks / clicks) * 100) : 0
        const ctr = s.visits ? Math.round((s.clicks / s.visits) * 1000) / 10 : 0
        const color = SOURCE_COLORS[s.source] ?? '#6b7280'
        return (
          <div key={s.source}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${color}60` }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.source}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 11.5, flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(129,140,248,0.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.15)' }}>
                  {s.visits.toLocaleString('en-US')} views
                </span>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                  {s.clicks.toLocaleString('en-US')} clicks
                </span>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                  {ctr}% CTR
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ProgressBar label="Views share" pct={visitPct} color={color} />
              <ProgressBar label="Clicks share" pct={clickPct} color="#34d399" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CountriesTab({ countries }: { countries: CountryRow[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!countries.length) return <EmptyState text="No geographic data for this period." />

  const totalVisits = countries.reduce((s, c) => s + c.visits, 0)
  const displayed = expanded ? countries : countries.slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayed.map(c => {
          const pct = totalVisits ? Math.round((c.visits / totalVisits) * 100) : 0
          const ctr = c.visits ? Math.round((c.clicks / c.visits) * 100) : 0
          return (
            <div key={c.country}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{c.country}</span>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', alignItems: 'center' }}>
                  <span>{c.visits.toLocaleString('en-US')} views</span>
                  {c.clicks > 0 && <span style={{ color: '#34d399' }}>{c.clicks} clicks</span>}
                  <span style={{ color: '#f59e0b', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>{ctr}%</span>
                  <span style={{ minWidth: 28, textAlign: 'right', opacity: 0.5 }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: 5, borderRadius: 3, width: `${pct}%`, background: 'linear-gradient(90deg, #a855f7, #818cf8)', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
      {countries.length > 10 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: 16, fontSize: 12, color: '#a855f7', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? 'Show less' : `Show all ${countries.length} countries →`}
        </button>
      )}
    </div>
  )
}

function PlatformsTab({ platforms, clicks }: { platforms: Array<{ name: string; count: number }>; clicks: number }) {
  if (!platforms.length) return <EmptyState text="No platform clicks yet." />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {platforms.map(p => {
        const pct = clicks ? Math.round((p.count / clicks) * 100) : 0
        const color = PLATFORM_COLORS[p.name] ?? '#a855f7'
        return (
          <div key={p.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: 'var(--muted)' }}>
                {p.count.toLocaleString('en-US')} clicks · <span style={{ color }}>{pct}%</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}80)`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsVisualizations({
  linkId,
  period,
  daily,
  platforms,
  countries,
  sources,
  views,
  clicks,
  mode,
  followerSnapshots = [],
}: Props) {
  const [metric, setMetric] = useState<Metric>('views')
  const [tab, setTab] = useState<BreakdownTab>('sources')

  const ctr = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0
  const latestFollowers = followerSnapshots.length > 0
    ? followerSnapshots[followerSnapshots.length - 1].followers
    : null

  const METRICS: Array<{ id: Metric; label: string; value: string | number; sub?: string; color: string; show: boolean }> = [
    { id: 'views', label: 'Views', value: views, color: '#a855f7', show: true },
    { id: 'clicks', label: 'Platform Clicks', value: clicks, color: '#34d399', show: true },
    { id: 'ctr', label: 'Click Rate', value: `${ctr}%`, sub: 'views → clicks', color: '#f59e0b', show: true },
    { id: 'followers', label: 'Followers', value: latestFollowers ?? '—', sub: 'Spotify playlist', color: '#38bdf8', show: latestFollowers !== null },
  ]

  const TABS: Array<{ id: BreakdownTab; label: string }> = [
    { id: 'sources', label: 'Traffic Sources' },
    { id: 'countries', label: 'Countries' },
    { id: 'platforms', label: 'Platforms' },
  ]

  const chartLabels: Record<Metric, string> = {
    views: 'Views over time',
    clicks: 'Platform clicks over time',
    ctr: 'Click rate over time',
    followers: 'Follower growth',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${METRICS.filter(m => m.show).length}, 1fr)`, gap: 10 }}
        className="analytics-metric-grid"
      >
        {METRICS.filter(m => m.show).map(m => (
          <MetricCard
            key={m.id}
            label={m.label}
            value={m.value}
            subLabel={m.sub}
            color={m.color}
            selected={metric === m.id}
            onClick={() => setMetric(m.id)}
          />
        ))}
      </div>

      {/* ── Chart panel ── */}
      <div style={{
        borderRadius: 16,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
        padding: '20px 20px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{chartLabels[metric]}</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {period === 'today' ? 'Today' : period === '7d' ? 'Last 7 days' : 'Last 28 days'}
          </span>
        </div>

        {metric === 'views' && <BarChart daily={daily} metric="views" />}
        {metric === 'clicks' && <BarChart daily={daily} metric="clicks" />}
        {metric === 'ctr' && <CTRLineChart daily={daily} />}
        {metric === 'followers' && <FollowerLineChart snapshots={followerSnapshots} />}

        {/* Legend */}
        {(metric === 'views' || metric === 'clicks') && (
          <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: metric === 'views' ? '#a855f7' : '#34d399', display: 'inline-block' }} />
              {metric === 'views' ? 'Page views' : 'Platform clicks'}
            </span>
          </div>
        )}
      </div>

      {/* ── Breakdown panel ── */}
      <div style={{
        borderRadius: 16,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid #a855f7' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                whiteSpace: 'nowrap',
              } as React.CSSProperties}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: 20 }}>
          {tab === 'sources' && <SourcesTab sources={sources} views={views} clicks={clicks} />}
          {tab === 'countries' && <CountriesTab countries={countries} />}
          {tab === 'platforms' && <PlatformsTab platforms={platforms} clicks={clicks} />}
        </div>
      </div>
    </div>
  )
}

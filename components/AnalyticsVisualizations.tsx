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

interface AnalyticsVisualizationsProps {
  linkId: string
  period: 'today' | '7d' | '28d'
  daily: DailyPoint[]
  platforms: Array<{ name: string; count: number }>
  countries: CountryRow[]
  sources: Array<{ source: string; visits: number; clicks: number }>
  views: number
  clicks: number
  mode: 'consent' | 'total'
}

const SOURCE_COLORS: Record<string, string> = {
  Instagram: '#e1306c',
  Facebook:  '#1877f2',
  Google:    '#4285f4',
  TikTok:    '#ff0050',
  YouTube:   '#ff0000',
  'X / Twitter': '#1d9bf0',
  Direct:    '#a855f7',
}

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#6b7280'
}

function AreaChart({ daily, maxValue }: { daily: DailyPoint[]; maxValue: number }) {
  const W = Math.max(daily.length * 36, 360)
  const H = 160
  const PAD_T = 12
  const PAD_B = 20
  const chartH = H - PAD_T - PAD_B

  function toX(i: number) { return i * (W / Math.max(daily.length - 1, 1)) }
  function toY(v: number) { return PAD_T + chartH - (v / maxValue) * chartH }

  const viewPoints = daily.map((d, i) => `${toX(i)},${toY(d.views)}`).join(' ')
  const clickPoints = daily.map((d, i) => `${toX(i)},${toY(d.clicks)}`).join(' ')

  const viewArea = `${toX(0)},${PAD_T + chartH} ${viewPoints} ${toX(daily.length - 1)},${PAD_T + chartH}`
  const clickArea = `${toX(0)},${PAD_T + chartH} ${clickPoints} ${toX(daily.length - 1)},${PAD_T + chartH}`

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Views and clicks by day"
        style={{ width: '100%', minWidth: 320, height: 160 }}
      >
        <defs>
          <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02"/>
          </linearGradient>
          <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02"/>
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, i) => (
          <line
            key={i}
            x1={0} x2={W}
            y1={PAD_T + chartH * pct} y2={PAD_T + chartH * pct}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
          />
        ))}

        {/* Area fills */}
        <polygon points={viewArea} fill="url(#gViews)" />
        <polygon points={clickArea} fill="url(#gClicks)" />

        {/* Lines */}
        <polyline
          points={viewPoints}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={clickPoints}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {daily.map((d, i) => (
          <g key={d.day}>
            {d.views > 0 && (
              <circle cx={toX(i)} cy={toY(d.views)} r="3" fill="#a855f7" stroke="rgba(5,5,10,0.8)" strokeWidth="1.5"/>
            )}
            {d.clicks > 0 && (
              <circle cx={toX(i)} cy={toY(d.clicks)} r="3" fill="#34d399" stroke="rgba(5,5,10,0.8)" strokeWidth="1.5"/>
            )}
          </g>
        ))}

        {/* X axis labels */}
        {daily.filter((_, i) => i % Math.max(1, Math.floor(daily.length / 7)) === 0).map((d, _, arr) => {
          const idx = daily.indexOf(d)
          return (
            <text
              key={d.day}
              x={toX(idx)}
              y={H - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="9"
              fontFamily="system-ui"
            >
              {d.day.slice(5)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

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
}: AnalyticsVisualizationsProps) {
  const [countryDialogOpen, setCountryDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'geo' | 'platforms'>('overview')

  const maxValue = Math.max(1, ...daily.flatMap((d) => [d.views, d.clicks]))
  const totalVisits = countries.reduce((sum, c) => sum + c.visits, 0)
  const totalClicks = countries.reduce((sum, c) => sum + c.clicks, 0)
  const hasActivity = daily.some((d) => d.views || d.clicks)

  const TABS = [
    { id: 'overview',  label: 'Overview' },
    { id: 'sources',   label: 'Traffic Sources' },
    { id: 'geo',       label: 'Geographic' },
    { id: 'platforms', label: 'Platforms' },
  ] as const

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all duration-150"
            style={activeTab === tab.id ? {
              background: 'rgba(168,85,247,0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168,85,247,0.3)',
              boxShadow: '0 0 12px rgba(168,85,247,0.1)',
            } : {
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Views &amp; Clicks</h2>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }}/>
                Views
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}/>
                Clicks
              </span>
            </div>
          </div>

          {hasActivity ? (
            <AreaChart daily={daily} maxValue={maxValue} />
          ) : (
            <div className="py-12 text-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }}>
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No data for this period.</p>
            </div>
          )}
        </section>
      )}

      {/* Traffic Sources tab */}
      {activeTab === 'sources' && (
        <section
          className="rounded-2xl p-5 space-y-5"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
        >
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Traffic Sources</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              Based on UTM parameters and referrer headers. Clicks can exceed views when visitors open multiple platforms.
            </p>
          </div>

          {sources.length ? (
            <div className="space-y-4">
              {sources.map((source) => {
                const visitPercent = views ? Math.round((source.visits / views) * 100) : 0
                const clickPercent = clicks ? Math.round((source.clicks / clicks) * 100) : 0
                const ctr = source.visits ? Math.round((source.clicks / source.visits) * 1000) / 10 : 0
                const color = getSourceColor(source.source)

                return (
                  <div key={source.source} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: color, display: 'inline-block', flexShrink: 0,
                            boxShadow: `0 0 6px ${color}60`,
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{source.source}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                        <span
                          className="px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(129,140,248,0.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.15)' }}
                        >
                          {source.visits} views
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}
                        >
                          {source.clicks} clicks
                        </span>
                        <span style={{ color: 'var(--muted)' }}>{ctr}% CTR</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                          <span>Views share</span><span>{visitPercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${visitPercent}%`, background: `linear-gradient(90deg, ${color}, ${color}80)` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                          <span>Clicks share</span><span>{clickPercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${clickPercent}%`, background: 'linear-gradient(90deg, #34d399, #34d39980)' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No traffic source data for this period.</p>
          )}
        </section>
      )}

      {/* Geographic tab */}
      {activeTab === 'geo' && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Geographic Breakdown</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{countries.length} countries</p>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setCountryDialogOpen(true)}
              aria-label="Expand country breakdown"
            >
              Expand all
            </button>
          </div>

          {countries.length ? (
            <div className="space-y-3">
              {countries.slice(0, 8).map((country) => {
                const pct = totalVisits ? Math.round((country.visits / totalVisits) * 100) : 0
                return (
                  <div key={country.country}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{country.country}</span>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                        <span>{country.visits.toLocaleString('en-US')} views</span>
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #a855f7, #818cf8)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No geographic data.</p>
          )}
        </section>
      )}

      {/* Platforms tab */}
      {activeTab === 'platforms' && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}
        >
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Platform Clicks Breakdown</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Where visitors choose to listen</p>
          </div>

          {platforms.length ? (
            <div className="space-y-4">
              {platforms.map((item) => {
                const percent = clicks ? Math.round((item.count / clicks) * 100) : 0
                const platformColors: Record<string, string> = {
                  Spotify: '#1db954', 'Apple Music': '#fc3c44',
                  'YouTube Music': '#ff0000', Deezer: '#a238ff',
                }
                const color = platformColors[item.name] ?? '#a855f7'
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--text)' }}>{item.name}</span>
                      <span style={{ color: 'var(--muted)' }}>{item.count.toLocaleString('en-US')} · {percent}%</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, ${color}80)` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No platform clicks yet.</p>
          )}
        </section>
      )}

      {/* Country Dialog */}
      {countryDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setCountryDialogOpen(false) }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-dialog-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6"
            style={{
              background: 'rgba(12,12,20,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            <header className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 id="country-dialog-title" className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  Country Breakdown
                </h2>
                <div className="mt-2 inline-flex rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                  {(['consent', 'total'] as const).map((value) => (
                    <a
                      key={value}
                      href={`/links/${linkId}?${new URLSearchParams({ mode: value, period })}`}
                      aria-current={mode === value ? 'page' : undefined}
                      className="rounded-md px-3 py-1 text-xs transition-all"
                      style={mode === value
                        ? { background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }
                        : { color: 'var(--muted)', border: '1px solid transparent' }}
                    >
                      {value === 'consent' ? 'Consent' : 'Total'}
                    </a>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost w-8 h-8 p-0 rounded-lg"
                onClick={() => setCountryDialogOpen(false)}
                aria-label="Close dialog"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Country', 'Views', 'Clicks', 'CTR'].map((h) => (
                      <th key={h} className="py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) => (
                    <tr key={country.country} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td colSpan={4} className="p-0">
                        <details>
                          <summary className="grid cursor-pointer grid-cols-4 gap-2 py-2.5 hover:bg-white/[0.02] rounded-lg px-1" style={{ color: 'var(--text)' }}>
                            <span>{country.country}</span>
                            <span>{country.visits}</span>
                            <span>{country.clicks}</span>
                            <span style={{ color: 'var(--muted)' }}>
                              {country.visits ? (country.clicks / country.visits * 100).toFixed(1) : '0.0'}%
                            </span>
                          </summary>
                          {country.platforms.length > 0 && (
                            <div className="mb-2 ml-4 pl-3 py-2 space-y-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Platforms</p>
                              {country.platforms.map((p) => (
                                <div key={p.platform} className="flex justify-between text-xs py-0.5" style={{ color: 'var(--muted)' }}>
                                  <span>{p.platform}</span><span>{p.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </details>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2.5 font-semibold text-sm" style={{ color: 'var(--text)' }}>Total</td>
                    <td className="py-2.5 font-semibold">{totalVisits}</td>
                    <td className="py-2.5 font-semibold">{totalClicks}</td>
                    <td className="py-2.5 text-sm" style={{ color: 'var(--muted)' }}>
                      {totalVisits ? (totalClicks / totalVisits * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

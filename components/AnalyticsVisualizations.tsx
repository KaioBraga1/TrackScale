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
  const maxValue = Math.max(1, ...daily.flatMap((item) => [item.views, item.clicks]))
  const totalVisits = countries.reduce((sum, country) => sum + country.visits, 0)
  const totalClicks = countries.reduce((sum, country) => sum + country.clicks, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="card space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Views &amp; Clicks</h2>
            <p className="text-xs text-muted">Consent data only</p>
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <span><i className="inline-block w-2 h-2 rounded-full bg-accent mr-1.5" />Views</span>
            <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />Clicks</span>
          </div>
        </div>
        {daily.some((point) => point.views || point.clicks) ? (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${Math.max(daily.length * 32, 320)} 160`}
              role="img"
              aria-label={`Views and clicks by day, ${mode} mode`}
              className="w-full min-w-[320px] h-40"
            >
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2={Math.max(daily.length * 32, 320)}
                  y1={16 + line * 40}
                  y2={16 + line * 40}
                  stroke="#2a2a2a"
                  strokeWidth="1"
                />
              ))}
              <polyline
                points={daily.map((point, index) =>
                  `${index * 32 + 16},${144 - (point.views / maxValue) * 120}`
                ).join(' ')}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={daily.map((point, index) =>
                  `${index * 32 + 16},${144 - (point.clicks / maxValue) * 120}`
                ).join(' ')}
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {daily.map((point, index) => (
                <text
                  key={point.day}
                  x={index * 32 + 16}
                  y="158"
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="8"
                >
                  {point.day.slice(8)}
                </text>
              ))}
            </svg>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">Sem dados para este período.</p>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Platform Clicks Breakdown</h2>
        {platforms.length ? platforms.map((item) => {
          const percent = clicks ? Math.round((item.count / clicks) * 100) : 0
          return (
            <div key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-28 truncate text-muted">{item.name}</span>
              <div className="h-2 flex-1 rounded-full bg-border">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-20 text-right text-xs text-muted">{item.count} · {percent}%</span>
            </div>
          )
        }) : <p className="text-sm text-muted">Sem cliques de plataforma.</p>}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Geographic Breakdown</h2>
            <p className="text-xs text-muted">{countries.length} países resolvidos</p>
          </div>
          <button
            type="button"
            className="btn-ghost text-xs"
            aria-label="Expand country breakdown"
            onClick={() => setCountryDialogOpen(true)}
          >
            ⤢ Expandir
          </button>
        </div>
        {countries.length ? (
          <div className="space-y-3">
            <svg viewBox="0 0 600 280" role="img" aria-label="Map with visitor volume by geographic coordinates" className="h-auto w-full rounded-lg border border-border bg-[#080b12]">
              <path d="M56 77l24-18 33-7 22 12 12 18-10 15-22 2-7 14-18 1-5 18-14-4-4-21-18-9zM143 130l19 7 10 20-7 22-8 29-13 27-11-13 4-25-8-20 6-20zM260 74l17-18 30-7 20 9 16-5 25 11 8 17-15 9-4 18-17 4-4 20-19 3-11-15-22 1-12-13-19-6-7-17zM315 137l20 5 15 17-7 22-14 11-7 24-13 15-13-18-2-22 10-23-6-18zM386 179l29-13 37 3 24 15-8 13-31-1-18 11-24-6zM458 104l18-14 28 6 10 17-14 11-19-3-9 11-18-9z" fill="#152033" stroke="#26364f" strokeWidth="1.5" />
              {countries.filter((country) => country.latitude !== null && country.longitude !== null).map((country) => {
                const x = ((country.longitude! + 180) / 360) * 600
                const y = ((90 - country.latitude!) / 180) * 280
                const radius = 4 + Math.min(10, Math.sqrt(country.visits))
                const opacity = Math.min(0.85, 0.3 + country.visits / Math.max(1, totalVisits))
                return (
                  <g key={country.country}>
                    <circle cx={x} cy={y} r={radius} fill="#a855f7" fillOpacity={opacity} stroke="#e9d5ff" strokeOpacity="0.7">
                      <title>{`${country.country}: ${country.visits} visits`}</title>
                    </circle>
                  </g>
                )
              })}
            </svg>
            <div className="space-y-2">
              {countries.slice(0, 5).map((country) => (
                <div key={country.country} className="flex justify-between text-sm">
                  <span className="truncate text-muted">{country.country}</span>
                  <span>{country.visits.toLocaleString('pt-BR')} <span className="text-muted">visits</span></span>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-sm text-muted">Sem dados geográficos.</p>}
      </section>

      <section className="card space-y-4 lg:col-span-2">
        <h2 className="font-semibold">Traffic Sources</h2>
        {sources.length ? (
          <div className="space-y-4">
            {sources.map((source) => {
              const visitPercent = views ? Math.round(source.visits / views * 100) : 0
              const clickPercent = clicks ? Math.round(source.clicks / clicks * 100) : 0
              const ctr = source.visits ? Math.round(source.clicks / source.visits * 1000) / 10 : 0
              return (
                <div key={source.source} className="grid grid-cols-[minmax(90px,1fr)_auto_auto_auto] items-center gap-3 text-sm">
                  <span className="truncate">{source.source}</span>
                  <span className="text-muted">{source.visits} visits</span>
                  <span className="text-muted">{source.clicks} clicks</span>
                  <span>{ctr}% CTR</span>
                  <div className="col-span-4 grid grid-cols-2 gap-2">
                    <div className="h-1.5 rounded-full bg-border">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${visitPercent}%` }} />
                    </div>
                    <div className="h-1.5 rounded-full bg-border">
                      <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${clickPercent}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-sm text-muted">Sem fontes de tráfego para este período.</p>}
      </section>

      {countryDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCountryDialogOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-dialog-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl"
          >
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="country-dialog-title" className="text-lg font-semibold">Country Breakdown</h2>
                <div className="mt-2 inline-flex rounded-md border border-border p-0.5">
                  {(['consent', 'total'] as const).map((value) => (
                    <a
                      key={value}
                      href={`/links/${linkId}?${new URLSearchParams({ mode: value, period })}`}
                      aria-current={mode === value ? 'page' : undefined}
                      className={`rounded px-2 py-1 text-[11px] ${mode === value ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
                    >
                      {value === 'consent' ? 'Consent' : 'Total'}
                    </a>
                  ))}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setCountryDialogOpen(false)} aria-label="Close dialog">✕</button>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-2">Country</th><th>Visits</th><th>Clicks</th><th>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) => (
                    <tr key={country.country} className="border-b border-border/50">
                      <td colSpan={4} className="p-0">
                        <details>
                          <summary className="grid cursor-pointer grid-cols-4 gap-2 py-2 hover:text-white">
                            <span>{country.country}</span>
                            <span>{country.visits}</span>
                            <span>{country.clicks}</span>
                            <span>{country.visits ? (country.clicks / country.visits * 100).toFixed(1) : '0.0'}%</span>
                          </summary>
                          {country.platforms.length > 0 && (
                            <div className="mb-2 ml-4 border-l border-border pl-3 text-xs text-muted">
                              <p className="mb-1">Platform Breakdown</p>
                              {country.platforms.map((platform) => (
                                <div key={platform.platform} className="flex justify-between py-0.5">
                                  <span>{platform.platform}</span><span>{platform.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </details>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2">Total</td><td>{totalVisits}</td><td>{totalClicks}</td>
                    <td>{totalVisits ? (totalClicks / totalVisits * 100).toFixed(1) : '0.0'}%</td>
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

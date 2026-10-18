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

type Period = 'today' | '7d' | '28d'
type AnalyticsMode = 'consent' | 'total'

const PERIODS: Record<Period, number> = { today: 1, '7d': 7, '28d': 28 }
const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  youtube_music: 'YouTube Music',
  deezer: 'Deezer',
}

export const metadata = { title: 'Estatísticas do Link' }

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
    include: { platforms: { orderBy: { order: 'asc' } } },
  })
  if (!link || link.userId !== session.user.id) notFound()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })
  const timezone = user?.timezone || 'UTC'
  const mode: AnalyticsMode = searchParams.mode === 'consent' ? 'consent' : 'total'
  const period: Period = searchParams.period === 'today' || searchParams.period === '7d'
    ? searchParams.period
    : '28d'
  const todayKey = getLocalDateKey(new Date(), timezone)
  const startKey = shiftDateKey(todayKey, -(PERIODS[period] - 1))
  const start = localMidnightUtc(startKey, timezone)

  const clickWhere = {
    linkId: link.id,
    createdAt: { gte: start },
    isFiltered: false,
    botScore: { lt: 0.5 },
    ...(mode === 'consent' ? { consentGranted: true } : {}),
  }
  const visitorWhere = {
    linkId: link.id,
    createdAt: { gte: start },
    botScore: { lt: 0.5 },
    clicks: {
      some: {
        eventType: 'LINK_VIEW',
        createdAt: { gte: start },
        isFiltered: false,
        botScore: { lt: 0.5 },
        ...(mode === 'consent' ? { consentGranted: true } : {}),
      },
    },
    ...(mode === 'consent' ? { consentStatus: 'GRANTED' as const } : {}),
  }

  const [views, clicks, platformStats, visitors, dailyRows, followerSnapshots] = await Promise.all([
    prisma.click.count({ where: { ...clickWhere, eventType: 'LINK_VIEW' } }),
    prisma.click.count({ where: { ...clickWhere, eventType: 'PLATFORM_CLICK' } }),
    prisma.click.groupBy({
      by: ['platform'],
      where: { ...clickWhere, eventType: 'PLATFORM_CLICK' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.visitor.findMany({
      where: visitorWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        country: true,
        city: true,
        device: true,
        browser: true,
        consentStatus: true,
        createdAt: true,
        botScore: true,
      },
    }),
    mode === 'consent'
      ?       prisma.$queryRaw<Array<{ day: Date | string; eventType: string; total: bigint }>>`
            SELECT ("createdAt" AT TIME ZONE ${timezone})::date AS day, "eventType", COUNT(*)::bigint AS total
          FROM "Click"
          WHERE "linkId" = ${link.id}
            AND "createdAt" >= ${start}
            AND "isFiltered" = false
            AND "botScore" < 0.5
            AND "consentGranted" = true
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `
      : prisma.$queryRaw<Array<{ day: Date | string; eventType: string; total: bigint }>>`
          SELECT ("createdAt" AT TIME ZONE ${timezone})::date AS day, "eventType", COUNT(*)::bigint AS total
          FROM "Click"
          WHERE "linkId" = ${link.id}
            AND "createdAt" >= ${start}
            AND "isFiltered" = false
            AND "botScore" < 0.5
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `,
    prisma.playlistFollowerSnapshot.findMany({
      where: { linkId: link.id, snapshotDate: { gte: start } },
      orderBy: { snapshotDate: 'asc' },
      select: { snapshotDate: true, followers: true },
    }),
  ])

  const days = Array.from({ length: PERIODS[period] }, (_, index) => {
    const key = shiftDateKey(startKey, index)
    return {
      day: key,
      views: 0,
      clicks: 0,
    }
  })
  const dailyMap = new Map(days.map((day) => [day.day, day]))
  for (const row of dailyRows) {
    const rowDay = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10)
    const day = dailyMap.get(rowDay)
    if (!day) continue
    if (row.eventType === 'LINK_VIEW') day.views = Number(row.total)
    if (row.eventType === 'PLATFORM_CLICK') day.clicks = Number(row.total)
  }

  const geographic = new Map<string, {
    visits: number
    clicks: number
    latitudes: number[]
    longitudes: number[]
    platforms: Map<string, number>
  }>()
  const sourceStats = new Map<string, { visits: number; clicks: number }>()
  for (const visitor of await prisma.visitor.findMany({
    where: visitorWhere,
    select: {
      country: true,
      latitude: true,
      longitude: true,
      referrer: true,
      utmSource: true,
      clicks: {
        where: {
          createdAt: { gte: start },
          isFiltered: false,
          botScore: { lt: 0.5 },
          ...(mode === 'consent' ? { consentGranted: true } : {}),
        },
        select: { eventType: true, platform: true },
      },
    },
  })) {
    const countryName = visitor.country ?? 'Unknown'
    const country = geographic.get(countryName) ?? {
      visits: 0,
      clicks: 0,
      latitudes: [],
      longitudes: [],
      platforms: new Map<string, number>(),
    }
    country.visits += 1
    if (visitor.latitude !== null) country.latitudes.push(visitor.latitude)
    if (visitor.longitude !== null) country.longitudes.push(visitor.longitude)

    const sourceName = classifySource(visitor.utmSource, visitor.referrer)
    const source = sourceStats.get(sourceName) ?? { visits: 0, clicks: 0 }
    source.visits += 1

    for (const click of visitor.clicks) {
      if (click.eventType !== 'PLATFORM_CLICK') continue
      country.clicks += 1
      source.clicks += 1
      const platform = click.platform ?? 'unknown'
      country.platforms.set(platform, (country.platforms.get(platform) ?? 0) + 1)
    }
    geographic.set(countryName, country)
    sourceStats.set(sourceName, source)
  }

  const countryRows = [...geographic.entries()]
    .map(([country, stats]) => ({
      country,
      visits: stats.visits,
      clicks: stats.clicks,
      latitude: stats.latitudes.length
        ? stats.latitudes.reduce((sum, value) => sum + value, 0) / stats.latitudes.length
        : null,
      longitude: stats.longitudes.length
        ? stats.longitudes.reduce((sum, value) => sum + value, 0) / stats.longitudes.length
        : null,
      platforms: [...stats.platforms.entries()]
        .map(([platform, count]) => ({ platform: PLATFORM_LABELS[platform] ?? platform, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.visits - a.visits)
  const sourceRows = [...sourceStats.entries()]
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.visits - a.visits)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fullUrl = `${appUrl}/l/${link.slug}`
  const baseQuery = new URLSearchParams({ mode, period }).toString()
  const clickRate = views ? Math.round((clicks / views) * 1000) / 10 : 0
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-muted hover:text-white text-sm">← Dashboard</Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-semibold">{link.title}</h1>
        <span className="text-muted text-sm">— {link.artist}</span>
      </div>

      <div className="card flex flex-col sm:flex-row gap-4 items-start">
        {link.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.coverUrl} alt={link.title} className="w-20 h-20 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{link.title}</p>
          <p className="text-muted text-sm">{link.artist}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-sm text-muted truncate">{fullUrl}</span>
            <CopyButton text={fullUrl} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {link.platforms.filter((platform) => platform.isActive).map((platform) => (
              <span key={platform.name} className="text-xs px-2 py-0.5 rounded-full bg-border text-muted">
                {PLATFORM_LABELS[platform.name] ?? platform.name}
              </span>
            ))}
          </div>
        </div>
        <Link href={`/links/${link.id}/edit`} className="btn-secondary text-xs">Editar</Link>
      </div>

      {link.metaPixelId && (
        <div className="card border-purple-900/40 space-y-3">
          <h2 className="font-semibold text-sm">Meta Pixel legado do link</h2>
          <p className="text-sm text-muted">ID: <span className="font-mono text-white">{link.metaPixelId}</span></p>
          <PixelTestButton pixelId={link.metaPixelId} />
        </div>
      )}

      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1 w-fit" aria-label="Modo de analytics">
          <FilterLink id={link.id} mode="consent" period={period} selected={mode === 'consent'}>Consent</FilterLink>
          <FilterLink id={link.id} mode="total" period={period} selected={mode === 'total'}>Total</FilterLink>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7d', '28d'] as const).map((value) => (
            <FilterLink key={value} id={link.id} mode={mode} period={value} selected={period === value}>
              {value === 'today' ? 'Today' : value === '7d' ? 'Last 7 days' : 'Last 28 days'}
            </FilterLink>
          ))}
          <a className="btn-secondary text-xs" href={`/api/links/${link.id}/export?${baseQuery}`}>Export CSV</a>
          <ShareButton url={fullUrl} />
        </div>
      </section>
      {period === '28d' && (
        <p className="text-xs text-muted">
          Este relatório mostra até 28 dias. Limites de analytics por plano dependem da integração de billing, ainda não configurada.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Views" value={views} />
        <StatCard label="Clicks" value={clicks} />
        <StatCard label="Click-Rate" value={`${clickRate}%`} />
      </div>

      <AnalyticsVisualizations
        linkId={link.id}
        period={period}
        daily={days}
        platforms={platformStats.map((item) => ({
          name: PLATFORM_LABELS[item.platform ?? ''] ?? item.platform ?? 'Unknown',
          count: item._count.id,
        }))}
        countries={countryRows}
        sources={sourceRows}
        views={views}
        clicks={clicks}
        mode={mode}
      />

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Playlist Followers</h2>
            <p className="text-xs text-muted">Daily Spotify snapshots; one snapshot per UTC day.</p>
          </div>
          {link.spotifyPlaylistId ? (
            <PlaylistFollowersSync linkId={link.id} />
          ) : (
            <p className="text-xs text-muted">Import a Spotify playlist when creating the smartlink to enable snapshots.</p>
          )}
        </div>
        {followerSnapshots.length ? (
          <div className="space-y-2">
            {followerSnapshots.map((snapshot) => (
              <div key={snapshot.snapshotDate.toISOString()} className="flex justify-between text-sm">
                <span className="text-muted">{snapshot.snapshotDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                <span>{snapshot.followers.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No follower snapshots yet.</p>}
      </section>

      <div className="card space-y-3">
        <h2 className="font-semibold">Visitantes recentes</h2>
        {visitors.length ? (
          <VisitorsTable visitors={visitors.map((visitor) => ({
            ...visitor,
            createdAt: visitor.createdAt.toISOString(),
          }))} />
        ) : (
          <p className="text-sm text-muted">Nenhum visitante no período selecionado.</p>
        )}
      </div>
      <p className="text-[11px] text-muted">Timezone: {timezone}. Consent mostra eventos aprovados e com consentimento explícito; Total inclui todo o tráfego não filtrado.</p>
    </div>
  )
}

function FilterLink({
  id,
  mode,
  period,
  selected,
  children,
}: {
  id: string
  mode: AnalyticsMode
  period: Period
  selected: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={`/links/${id}?${new URLSearchParams({ mode, period })}`}
      aria-current={selected ? 'page' : undefined}
      className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
        selected ? 'bg-accent text-white' : 'text-muted hover:text-white hover:bg-card'
      }`}
    >
      {children}
    </Link>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card">
      <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  )
}

function classifySource(utmSource: string | null, referrer: string | null): string {
  const value = (utmSource || referrer || '').toLowerCase()
  if (!value) return 'Direct'
  if (value.includes('instagram')) return 'Instagram'
  if (value.includes('facebook') || value.includes('fb')) return 'Facebook'
  if (value.includes('http')) {
    try {
      const host = new URL(value).hostname.replace(/^www\./, '')
      return host || 'Other'
    } catch {
      return 'Other'
    }
  }
  return value === 'direct' ? 'Direct' : 'Other'
}

function getLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value])
    )
    const localAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    )
    instant += target - localAsUtc
  }
  return new Date(instant)
}

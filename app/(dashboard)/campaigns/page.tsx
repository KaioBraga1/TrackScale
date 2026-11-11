import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  getCampaigns, getAccountInsights,
  fmtMoney, fmtNum, fmtPct, getActionValue,
  OBJECTIVE_LABELS,
  type MetaCampaign, type MetaInsights,
} from '@/lib/meta'

export const metadata = { title: 'Campaigns' }

type Period = 'today' | 'last_7d' | 'last_30d' | 'this_month'
const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  last_7d: 'Last 7 days',
  last_30d: 'Last 30 days',
  this_month: 'This month',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MetaCampaign['status'] }) {
  const configs = {
    ACTIVE: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', dot: true },
    PAUSED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', dot: false },
    ARCHIVED: { color: 'var(--muted)', bg: 'var(--glass-bg)', border: 'var(--glass-border)', dot: false },
    DELETED: { color: 'var(--muted)', bg: 'var(--glass-bg)', border: 'var(--glass-border)', dot: false },
  }
  const c = configs[status] ?? configs.PAUSED
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 20, color: c.color,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      {c.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}` }} />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function MetricCard({ label, value, sub, color = '#a855f7', icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string
}) {
  return (
    <div className="lift-card" style={{
      borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.02) 100%)`,
      border: `1px solid ${color}18`,
      boxShadow: `0 0 20px ${color}06, 0 4px 24px rgba(0,0,0,0.3)`,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}25, transparent)` }} />
      <div style={{ position: 'absolute', top: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${color}10 0%, transparent 70%)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, color }}>
            <path d={icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { period?: string; error?: string; connected?: string; disconnected?: string; detail?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const period = (['today', 'last_7d', 'last_30d', 'this_month'].includes(searchParams.period ?? '')
    ? searchParams.period
    : 'last_30d') as Period

  const [metaConn, totalViews, totalClicks, botClicks, followerLatest] = await Promise.all([
    prisma.metaConnection.findUnique({ where: { userId: session.user.id } }),
    prisma.click.count({ where: { link: { userId: session.user.id }, eventType: 'LINK_VIEW', isFiltered: false, botScore: { lt: 0.5 } } }),
    prisma.click.count({ where: { link: { userId: session.user.id }, eventType: 'PLATFORM_CLICK', isFiltered: false, botScore: { lt: 0.5 } } }),
    prisma.click.count({ where: { link: { userId: session.user.id }, isFiltered: true } }),
    prisma.playlistFollowerSnapshot.findFirst({
      where: { link: { userId: session.user.id } },
      orderBy: { snapshotDate: 'desc' },
    }),
  ])

  // Try to fetch Meta data if connected
  let metaInsights: MetaInsights | null = null
  let campaigns: MetaCampaign[] = []
  let metaError: string | null = null

  if (metaConn?.selectedAdAccountId) {
    try {
      ;[metaInsights, campaigns] = await Promise.all([
        getAccountInsights(metaConn.accessToken, metaConn.selectedAdAccountId, period),
        getCampaigns(metaConn.accessToken, metaConn.selectedAdAccountId, period),
      ])
    } catch (err) {
      metaError = err instanceof Error ? err.message : 'Failed to fetch Meta data'
    }
  }

  const currency = metaConn?.currency ?? 'USD'
  const isConnected = !!metaConn
  const hasData = !!metaInsights

  // Funnel data
  const metaClicks = parseInt(metaInsights?.clicks ?? '0') || 0
  const metaImpressions = parseInt(metaInsights?.impressions ?? '0') || 0
  const arrivalRate = metaClicks > 0 ? Math.round((totalViews / metaClicks) * 100) : null
  const convRate = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0

  // Cost metrics
  const spend = parseFloat(metaInsights?.spend ?? '0') || 0
  const costPerView = spend > 0 && totalViews > 0 ? spend / totalViews : null
  const costPerClick = spend > 0 && totalClicks > 0 ? spend / totalClicks : null

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {searchParams.connected && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: 13 }}>
          Meta Ads connected successfully! Campaigns are loading below.
        </div>
      )}
      {searchParams.disconnected && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--muted)', fontSize: 13 }}>
          Meta Ads disconnected.
        </div>
      )}
      {searchParams.error === 'meta_not_configured' && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          Meta App credentials not configured. Set both META_APP_ID and META_APP_SECRET environment variables.
        </div>
      )}
      {searchParams.error === 'meta_oauth_denied' && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          Meta authorization was canceled or denied. Try connecting again and approve the requested permissions.
        </div>
      )}
      {searchParams.error === 'missing_oauth_code' && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          Meta did not return an authorization code. Please try connecting again.
        </div>
      )}
      {searchParams.error === 'invalid_state' && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          Meta authorization expired or could not be verified. Please try connecting again.
        </div>
      )}
      {searchParams.error === 'token_exchange_failed' && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          TrackScaler could not finish connecting to Meta. Check the Meta app credentials and callback URL, then try again.
          {searchParams.detail && <div style={{ marginTop: 6, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11.5, opacity: 0.85 }}>Meta says: {searchParams.detail}</div>}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Performance</p>
          <h1 className="font-outfit font-bold" style={{ fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            Campaigns
          </h1>
          {isConnected && metaConn.metaUserName && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Meta: {metaConn.metaUserName}
              {metaConn.selectedAdAccountName && <> · <span style={{ color: 'var(--text-secondary)' }}>{metaConn.selectedAdAccountName}</span></>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isConnected && (
            <form action="/api/auth/meta/disconnect" method="POST">
              <button type="submit" className="btn-ghost text-xs px-3 py-1.5" style={{ color: 'var(--muted)', fontSize: 11 }}>
                Disconnect Meta
              </button>
            </form>
          )}
          {!isConnected && (
            <a href="/api/auth/meta" className="btn-primary gap-2 text-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Connect Meta Ads
            </a>
          )}
        </div>
      </div>

      {/* Period filter */}
      {isConnected && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
            <Link
              key={p}
              href={`/campaigns?period=${p}`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={period === p ? { background: '#a855f7', color: 'white' } : { color: 'var(--muted)' }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Not connected state */}
      {!isConnected && (
        <div style={{
          borderRadius: 20, padding: '48px 32px', textAlign: 'center',
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, rgba(24,119,242,0.15), rgba(24,119,242,0.05))', border: '1px solid rgba(24,119,242,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg viewBox="0 0 24 24" fill="#1877f2" style={{ width: 36, height: 36 }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>Connect Meta Ads</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Connect your Meta Ads account to see CPC, CPL, ROI, impressions, reach, spend and campaign performance — all combined with your Smart Link traffic data.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto 32px' }}>
            {['CPC, CPL, ROI & spend', 'Impressions, reach & frequency', 'Campaign-level breakdown', 'Full traffic funnel analysis'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 20 20" fill="#34d399" style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
          <a href="/api/auth/meta" className="btn-primary gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Connect Meta Ads
          </a>
        </div>
      )}

      {/* Meta API error */}
      {isConnected && metaError && (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13 }}>
          <strong>Meta API error:</strong> {metaError}
          {metaError.includes('expired') || metaError.includes('token') ? (
            <> — <a href="/api/auth/meta" style={{ color: '#fca5a5', textDecoration: 'underline' }}>Reconnect Meta</a></>
          ) : null}
        </div>
      )}

      {/* Overview metrics — both Meta + organic */}
      {isConnected && (
        <>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Meta Ads — {PERIOD_LABELS[period]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger-children">
              <MetricCard
                label="Total Spend"
                value={hasData ? fmtMoney(metaInsights!.spend, currency) : '—'}
                sub={hasData && metaInsights!.frequency ? `${fmtPct(metaInsights!.frequency)} freq` : undefined}
                color="#f87171"
                icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <MetricCard
                label="Impressions"
                value={hasData ? fmtNum(metaInsights!.impressions) : '—'}
                sub={hasData ? `${fmtNum(metaInsights!.reach)} reach` : undefined}
                color="#818cf8"
                icon="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"
              />
              <MetricCard
                label="Meta Clicks"
                value={hasData ? fmtNum(metaInsights!.clicks) : '—'}
                sub={hasData ? `${fmtPct(metaInsights!.ctr)} CTR` : undefined}
                color="#34d399"
                icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
              />
              <MetricCard
                label="Avg CPC"
                value={hasData ? fmtMoney(metaInsights!.cpc, currency) : '—'}
                sub={hasData ? `${fmtMoney(metaInsights!.cpp, currency)} CPM` : undefined}
                color="#f59e0b"
                icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
              {hasData && (() => {
                const leads = getActionValue(metaInsights!.actions, 'lead') ||
                  getActionValue(metaInsights!.actions, 'onsite_conversion.lead_grouped')
                const pageViews = getActionValue(metaInsights!.actions, 'link_click')
                const saves = getActionValue(metaInsights!.actions, 'post_save') ||
                  getActionValue(metaInsights!.actions, 'onsite_conversion.save_to_collection')
                return (
                  <>
                    {leads > 0 && (
                      <MetricCard
                        label="Leads"
                        value={fmtNum(leads)}
                        sub={`${fmtMoney(spend / leads, currency)} CPL`}
                        color="#c084fc"
                        icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    )}
                    {saves > 0 && (
                      <MetricCard
                        label="Saves"
                        value={fmtNum(saves)}
                        color="#38bdf8"
                        icon="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    )}
                    {pageViews > 0 && (
                      <MetricCard
                        label="Link Clicks"
                        value={fmtNum(pageViews)}
                        sub={`${fmtMoney(spend / pageViews, currency)} each`}
                        color="#a3e635"
                        icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* TrackScaler organic metrics */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Smart Link — All time</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
              <MetricCard label="Smart Link Views" value={fmtNum(totalViews)} color="#818cf8" icon="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" />
              <MetricCard label="Platform Clicks" value={fmtNum(totalClicks)} sub={`${convRate}% CVR`} color="#34d399" icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
              <MetricCard label="Bots Filtered" value={fmtNum(botClicks)} color="#f59e0b" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              {followerLatest && (
                <MetricCard label="Followers" value={fmtNum(followerLatest.followers)} color="#38bdf8" icon="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              )}
            </div>
          </div>

          {/* Traffic Funnel */}
          {hasData && metaImpressions > 0 && (
            <div style={{ borderRadius: 20, padding: '24px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Traffic Funnel</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <FunnelRow label="Meta Impressions" value={metaImpressions} max={metaImpressions} color="#818cf8" pct={100} />
                <FunnelRow label="Meta Clicks" value={metaClicks} max={metaImpressions} color="#34d399" pct={metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0} sub={`${fmtPct(metaInsights!.ctr)} CTR`} />
                <FunnelRow label="Smart Link Views" value={totalViews} max={metaImpressions} color="#a855f7" pct={metaImpressions > 0 ? (totalViews / metaImpressions) * 100 : 0} sub={arrivalRate != null ? `${arrivalRate}% arrival rate` : undefined} />
                {botClicks > 0 && <FunnelRow label="Bots Filtered" value={botClicks} max={metaImpressions} color="#f59e0b" pct={metaImpressions > 0 ? (botClicks / metaImpressions) * 100 : 0} sub="detected & blocked" />}
                <FunnelRow label="Platform Clicks" value={totalClicks} max={metaImpressions} color="#38bdf8" pct={metaImpressions > 0 ? (totalClicks / metaImpressions) * 100 : 0} sub={`${convRate}% CVR`} />
                {costPerView && <FunnelRow label="Cost per View" value={0} max={1} color="#c084fc" pct={0} valueDisplay={fmtMoney(costPerView, currency)} />}
                {costPerClick && <FunnelRow label="Cost per Click" value={0} max={1} color="#f87171" pct={0} valueDisplay={fmtMoney(costPerClick, currency)} />}
              </div>
            </div>
          )}

          {/* Campaign list */}
          {campaigns.length > 0 && (
            <div style={{ borderRadius: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  Active & Paused Campaigns ({campaigns.length})
                </p>
              </div>
              <div>
                {campaigns.map((campaign, i) => {
                  const ins = campaign.insights?.data?.[0]
                  return (
                    <div
                      key={campaign.id}
                      style={{
                        padding: '18px 24px',
                        borderBottom: i < campaigns.length - 1 ? '1px solid var(--glass-border)' : 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--glass-bg-hover)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <StatusBadge status={campaign.status} />
                            <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1px 6px', borderRadius: 4 }}>
                              {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
                            </span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{campaign.name}</p>
                          {(campaign.daily_budget || campaign.lifetime_budget) && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                              {campaign.daily_budget
                                ? `${fmtMoney(parseInt(campaign.daily_budget) / 100, currency)}/day budget`
                                : `${fmtMoney(parseInt(campaign.lifetime_budget ?? '0') / 100, currency)} lifetime`}
                            </p>
                          )}
                        </div>
                        {ins ? (
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <CampStat label="Spend" value={fmtMoney(ins.spend, currency)} color="#f87171" />
                            <CampStat label="Impressions" value={fmtNum(ins.impressions)} color="#818cf8" />
                            <CampStat label="Clicks" value={fmtNum(ins.clicks)} color="#34d399" />
                            <CampStat label="CPC" value={fmtMoney(ins.cpc, currency)} color="#f59e0b" />
                            <CampStat label="CTR" value={fmtPct(ins.ctr)} color="#a855f7" />
                            {ins.frequency && <CampStat label="Freq" value={parseFloat(ins.frequency).toFixed(1)} color="var(--muted)" />}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>No data for this period</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {campaigns.length === 0 && !metaError && (
            <div style={{ padding: '32px', textAlign: 'center', borderRadius: 20, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>No active or paused campaigns found for this period.</p>
            </div>
          )}

          {/* Smart Autopilot — upcoming PRO feature */}
          <div style={{ borderRadius: 20, padding: '24px', background: 'var(--glass-bg)', border: '1px solid rgba(168,85,247,0.15)', position: 'relative', overflow: 'hidden', opacity: 0.7 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c084fc' }}>PRO Feature — Coming Soon</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Auto-optimization & duplication</span>
            </div>
            <div style={{ position: 'relative', zIndex: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Smart Autopilot</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Auto Budget Optimization', 'Auto Duplication', 'Smart Scaling'].map(f => (
                  <div key={f} style={{ padding: 14, borderRadius: 12, background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.1)' }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{f}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>Set target CPC/CPL and let TrackScaler manage your budget automatically.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FunnelRow({ label, value, max, color, pct, sub, valueDisplay }: {
  label: string; value: number; max: number; color: string; pct: number; sub?: string; valueDisplay?: string
}) {
  const width = Math.max(2, Math.min(100, pct))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 160, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
        {sub && <div style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.7 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${color}60` }} />
      </div>
      <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {valueDisplay ?? (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString())}
        </span>
      </div>
    </div>
  )
}

function CampStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 52 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: 'var(--muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

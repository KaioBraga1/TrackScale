import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { toggleLinkActive } from '../links/actions'
import CopyButton from '@/components/CopyButton'
import DeleteLinkButton from '@/components/DeleteLinkButton'

export const metadata = { title: 'Dashboard' }

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

  const totalLinks    = links.length
  const totalViews    = [...viewMap.values()].reduce((a, b) => a + b, 0)
  const totalClicks   = [...clickMap.values()].reduce((a, b) => a + b, 0)
  const avgCtr        = totalViews ? Math.round((totalClicks / totalViews) * 1000) / 10 : 0

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {searchParams.spotify === 'connected' && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
          Spotify conectado com sucesso!
        </div>
      )}
      {searchParams.spotify === 'error' && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          Erro ao conectar Spotify. Tente novamente.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>Workspace</p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Dashboard</h1>
        </div>
        <Link href="/links/new" className="btn-primary gap-1.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
          </svg>
          Novo Smart Link
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Smart Links"     value={totalLinks}  />
        <StatCard label="Views reais"     value={totalViews}  />
        <StatCard label="Cliques reais"   value={totalClicks} />
        <StatCard label="CTR médio" value={`${avgCtr}%`} accent />
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" style={{ color: 'var(--accent)' }}>
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
              <path d="M10.172 13.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text)' }}>Nenhum smart link ainda</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Crie seu primeiro link e comece a rastrear.</p>
          </div>
          <Link href="/links/new" className="btn-primary mt-2">Criar primeiro link</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const realClicks = clickMap.get(link.id) ?? 0
            const views      = viewMap.get(link.id) ?? 0
            const fullUrl    = `${appUrl}/l/${link.slug}`

            return (
              <div
                key={link.id}
                className="card-hover flex flex-col sm:flex-row gap-4"
                style={{ opacity: link.isActive ? 1 : 0.55 }}
              >
                {/* Cover */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
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
                      <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{link.title}</p>
                      <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>{link.artist}</p>
                    </div>
                    <span className={link.isActive ? 'badge-success' : 'badge-muted'}>
                      {link.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Slug */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs truncate" style={{ color: 'var(--muted)' }}>
                      /l/{link.slug}
                    </span>
                    <CopyButton text={fullUrl} />
                  </div>

                  {/* Platforms */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {link.platforms.map((p) => (
                      <span key={p.name} className="badge-muted text-xs">
                        {PLATFORM_LABELS[p.name] ?? p.name}
                      </span>
                    ))}
                  </div>

                  {/* Stats + Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      {views.toLocaleString('pt-BR')} views · {realClicks.toLocaleString('pt-BR')} cliques
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                      <Link href={`/links/${link.id}`} className="btn-ghost text-xs px-2.5 py-1.5">
                        Stats
                      </Link>
                      <Link href={`/links/${link.id}/edit`} className="btn-secondary text-xs px-2.5 py-1.5">
                        Editar
                      </Link>
                      <form action={toggleLinkActive.bind(null, link.id, !link.isActive)}>
                        <button type="submit" className="btn-ghost text-xs px-2.5 py-1.5">
                          {link.isActive ? 'Desativar' : 'Ativar'}
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

function StatCard({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="stat-card">
      <p
        className="text-2xl font-bold font-mono"
        style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify:       'Spotify',
  apple_music:   'Apple Music',
  youtube_music: 'YouTube Music',
  deezer:        'Deezer',
}

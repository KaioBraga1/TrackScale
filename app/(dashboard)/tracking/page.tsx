import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPixel, deletePixel, updatePixel } from './actions'

export const metadata = { title: 'Tracking | TrackScale' }

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: { created?: string; updated?: string; deleted?: string; error?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [pixels, artists] = await Promise.all([
    prisma.pixel.findMany({
      where: { userId: session.user.id },
      include: {
        artists: { select: { artist: { select: { id: true, name: true } } } },
        links: { select: { link: { select: { id: true, title: true, artist: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.artist.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const isError = !!searchParams.error
  const message = isError
    ? searchParams.error === 'duplicate' ? 'Pixel duplicado ou inválido.'
      : searchParams.error === 'artist' ? 'Artista selecionado inválido.'
      : 'Não foi possível concluir a ação.'
    : searchParams.created ? 'Pixel adicionado.'
    : searchParams.updated ? 'Pixel atualizado.'
    : searchParams.deleted ? 'Pixel removido.'
    : null

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>Data Connections</p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text)' }}>Tracking</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Pixels reutilizáveis em artistas e smartlinks.</p>
      </header>

      {message && (
        <div
          role="status"
          className="rounded-lg border px-4 py-3 text-sm"
          style={isError
            ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171' }
            : { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#34d399' }}
        >
          {message}
        </div>
      )}

      {/* Add pixel form */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Adicionar Pixel</h2>
        <form action={createPixel} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">Nome do pixel</label>
            <input name="name" required maxLength={80} className="input" placeholder="Osten Meta Ads" />
          </div>
          <div>
            <label className="label">Meta Pixel ID</label>
            <input
              name="metaPixelId"
              required
              inputMode="numeric"
              pattern="\d{10,20}"
              maxLength={20}
              className="input font-mono"
              placeholder="1234567890123456"
            />
          </div>
          {artists.length > 0 && (
            <div>
              <label className="label">Artistas</label>
              <select name="artistIds" multiple className="input" style={{ minHeight: '80px' }}>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary self-end">Adicionar</button>
        </form>
      </section>

      {/* Pixel list */}
      {pixels.length === 0 ? (
        <div className="card py-16 text-center space-y-2">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-medium" style={{ color: 'var(--text)' }}>Nenhum pixel configurado</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Adicione um Meta Pixel para rastrear conversões nos seus smartlinks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pixels.map((pixel) => (
            <article key={pixel.id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{pixel.name}</h2>
                  <details className="mt-1">
                    <summary className="cursor-pointer font-mono text-xs" style={{ color: 'var(--muted)' }}>
                      ID: ••••••••{pixel.metaPixelId.slice(-4)} <span className="font-sans underline">revelar</span>
                    </summary>
                    <code className="mt-1 block font-mono text-xs" style={{ color: 'var(--muted)' }}>{pixel.metaPixelId}</code>
                  </details>
                </div>
                <form action={deletePixel}>
                  <input type="hidden" name="id" value={pixel.id} />
                  <button className="btn-danger text-xs" type="submit">Remover</button>
                </form>
              </div>

              {/* Assigned artists + links */}
              <div className="flex flex-wrap gap-2">
                {pixel.artists.map(({ artist }) => (
                  <span key={artist.id} className="badge-accent">{artist.name}</span>
                ))}
                {pixel.links.map(({ link }) => (
                  <span key={link.id} className="badge-muted">
                    {link.artist ? `${link.artist} · ` : ''}{link.title}
                  </span>
                ))}
                {!pixel.artists.length && !pixel.links.length && (
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>Sem atribuições</span>
                )}
              </div>

              {/* Edit */}
              <details style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <summary className="cursor-pointer text-xs" style={{ color: 'var(--muted)' }}>Editar pixel ▾</summary>
                <form action={updatePixel} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="id" value={pixel.id} />
                  <div>
                    <label className="label">Nome</label>
                    <input name="name" defaultValue={pixel.name} required maxLength={80} className="input" />
                  </div>
                  <div>
                    <label className="label">Meta Pixel ID</label>
                    <input name="metaPixelId" defaultValue={pixel.metaPixelId} required pattern="\d{10,20}" maxLength={20} className="input font-mono" />
                  </div>
                  {artists.length > 0 && (
                    <div>
                      <label className="label">Artistas</label>
                      <select
                        name="artistIds"
                        multiple
                        defaultValue={pixel.artists.map(({ artist }) => artist.id)}
                        className="input"
                        style={{ minHeight: '80px' }}
                      >
                        {artists.map((artist) => (
                          <option key={artist.id} value={artist.id}>{artist.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button type="submit" className="btn-secondary self-end text-sm">Guardar</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

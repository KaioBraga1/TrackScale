'use client'

import { useActionState, useState } from 'react'
import { createArtist, updateArtist, deleteArtist, type ArtistFormState } from './actions'

type Artist = {
  id: string
  name: string
  spotifyId: string | null
  imageUrl: string | null
  links: { id: string; title: string; slug: string }[]
  pixels: { pixel: { id: string; name: string; metaPixelId: string } }[]
}

export default function ArtistList({ artists }: { artists: Artist[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <CreateArtistForm />

      {artists.length === 0 ? (
        <div className="card py-16 text-center space-y-2">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-medium" style={{ color: 'var(--text)' }}>Nenhum artista cadastrado</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Adicione artistas para organizar seus smartlinks e pixels por artista.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {artists.map((artist) =>
            editingId === artist.id ? (
              <EditArtistForm
                key={artist.id}
                artist={artist}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onEdit={() => setEditingId(artist.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function CreateArtistForm() {
  const [state, action, pending] = useActionState<ArtistFormState, FormData>(createArtist, null)

  return (
    <section className="card space-y-4">
      <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Adicionar Artista</h2>

      {state?.error && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {state.error}
        </p>
      )}

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label">Nome do artista *</label>
          <input name="name" required maxLength={100} className="input" placeholder="Nome Artístico" />
        </div>
        <div>
          <label className="label">Spotify Artist ID</label>
          <input
            name="spotifyId"
            maxLength={22}
            pattern="[A-Za-z0-9]{22}"
            className="input font-mono"
            placeholder="0TnOYISbd1XYRBk9myaseg"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary self-end">
          {pending ? 'Salvando…' : 'Adicionar'}
        </button>
      </form>
    </section>
  )
}

function ArtistCard({ artist, onEdit }: { artist: Artist; onEdit: () => void }) {
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{artist.name}</p>
            {artist.spotifyId && (
              <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                Spotify: {artist.spotifyId}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="btn-secondary text-xs">Editar</button>
          <form action={deleteArtist}>
            <input type="hidden" name="id" value={artist.id} />
            <button
              type="submit"
              className="btn-danger text-xs"
              onClick={(e) => {
                if (!confirm(`Remover "${artist.name}"? Os smartlinks associados continuarão existindo.`)) {
                  e.preventDefault()
                }
              }}
            >
              Remover
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {artist.pixels.map(({ pixel }) => (
          <span key={pixel.id} className="badge-accent text-xs">{pixel.name}</span>
        ))}
        {artist.links.map((link) => (
          <a
            key={link.id}
            href={`/links/${link.id}`}
            className="badge-muted text-xs hover:opacity-80 transition-opacity"
          >
            {link.title}
          </a>
        ))}
        {!artist.pixels.length && !artist.links.length && (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Sem pixels ou smartlinks associados</span>
        )}
      </div>
    </article>
  )
}

function EditArtistForm({ artist, onClose }: { artist: Artist; onClose: () => void }) {
  const boundAction = updateArtist.bind(null, artist.id)
  const [state, action, pending] = useActionState<ArtistFormState, FormData>(boundAction, null)

  return (
    <article className="card space-y-4" style={{ border: '1px solid var(--accent-glow)' }}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Editar: {artist.name}</h2>
        <button onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
      </div>

      {state?.error && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {state.error}
        </p>
      )}

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label">Nome do artista *</label>
          <input name="name" required maxLength={100} defaultValue={artist.name} className="input" />
        </div>
        <div>
          <label className="label">Spotify Artist ID</label>
          <input
            name="spotifyId"
            maxLength={22}
            pattern="[A-Za-z0-9]{22}"
            defaultValue={artist.spotifyId ?? ''}
            className="input font-mono"
            placeholder="0TnOYISbd1XYRBk9myaseg"
          />
        </div>
        <div>
          <label className="label">Foto (URL)</label>
          <input
            name="imageUrl"
            type="url"
            maxLength={2048}
            defaultValue={artist.imageUrl ?? ''}
            className="input"
            placeholder="https://i.scdn.co/…"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary self-end sm:col-start-3 sm:row-start-1">
          {pending ? 'Salvando…' : 'Guardar'}
        </button>
      </form>
    </article>
  )
}

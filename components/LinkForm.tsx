'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import type { LinkFormState } from '@/app/(dashboard)/links/actions'

interface Platform {
  name: string
  url: string
  deeplinkUrl?: string | null
  isActive?: boolean
  order?: number
}

interface PixelOption {
  id: string
  name: string
  metaPixelId: string
}

interface ArtistOption {
  id: string
  name: string
}

interface LinkFormProps {
  action: (prev: LinkFormState, formData: FormData) => Promise<LinkFormState>
  defaultValues?: {
    title?: string
    artist?: string
    slug?: string
    coverUrl?: string
    theme?: string
    metaPixelId?: string
    spotifyArtistId?: string
    spotifyArtistName?: string
    spotifyPlaylistId?: string
    platforms?: Platform[]
  }
  submitLabel: string
  hasSpotify?: boolean
  pixels?: PixelOption[]
  selectedPixelIds?: string[]
  artists?: ArtistOption[]
  selectedArtistIds?: string[]
}

const PLATFORMS = [
  { name: 'spotify',       label: 'Spotify',       placeholder: 'https://open.spotify.com/...' },
  { name: 'apple_music',   label: 'Apple Music',   placeholder: 'https://music.apple.com/...' },
  { name: 'youtube_music', label: 'YouTube Music', placeholder: 'https://music.youtube.com/...' },
  { name: 'deezer',        label: 'Deezer',        placeholder: 'https://www.deezer.com/...' },
]

const THEMES = [
  { id: 'dark-navy',   label: 'Navy',    bg: '#0e0e1c', ring: '#4040a0' },
  { id: 'dark-purple', label: 'Roxo',    bg: '#120820', ring: '#7040a0' },
  { id: 'midnight',    label: 'Preto',   bg: '#080808', ring: '#505050' },
  { id: 'forest',      label: 'Floresta',bg: '#060f07', ring: '#205020' },
  { id: 'ocean',       label: 'Oceano',  bg: '#040e1a', ring: '#205080' },
  { id: 'crimson',     label: 'Vinho',   bg: '#120608', ring: '#802040' },
]

export default function LinkForm({
  action,
  defaultValues,
  submitLabel,
  hasSpotify,
  pixels = [],
  selectedPixelIds = [],
  artists = [],
  selectedArtistIds = [],
}: LinkFormProps) {
  const [state, formAction] = useFormState(action, null)

  const [title, setTitle]       = useState(defaultValues?.title ?? '')
  const [artist, setArtist]     = useState(defaultValues?.artist ?? '')
  const [slug, setSlug]         = useState(defaultValues?.slug ?? '')
  const [coverUrl, setCoverUrl] = useState(defaultValues?.coverUrl ?? '')
  const [theme, setTheme]       = useState(defaultValues?.theme ?? 'dark-navy')

  const [spotifyImportUrl, setSpotifyImportUrl] = useState('')
  const [importing, setImporting]               = useState(false)
  const [importError, setImportError]           = useState<string | null>(null)
  const [importedCover, setImportedCover]       = useState<string | null>(null)
  const [spotifyArtistId, setSpotifyArtistId] = useState(defaultValues?.spotifyArtistId ?? '')
  const [spotifyArtistName, setSpotifyArtistName] = useState(defaultValues?.spotifyArtistName ?? '')
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState(defaultValues?.spotifyPlaylistId ?? '')
  const [chosenPixels, setChosenPixels] = useState<string[]>(selectedPixelIds)
  const [chosenArtists, setChosenArtists] = useState<string[]>(selectedArtistIds)
  const [draggingPlatform, setDraggingPlatform] = useState<string | null>(null)

  const [platforms, setPlatforms] = useState(() => PLATFORMS.map(({ name, label, placeholder }) => {
    const saved = defaultValues?.platforms?.find((platform) => platform.name === name)
    return {
      name,
      label,
      placeholder,
      url: saved?.url ?? '',
      deeplinkUrl: saved?.deeplinkUrl ?? '',
      isActive: saved?.isActive ?? true,
    }
  }).sort((a, b) => {
    const order = (name: string) =>
      defaultValues?.platforms?.find((platform) => platform.name === name)?.order ?? 999
    return order(a.name) - order(b.name)
  }))

  const fieldError = (field: string) =>
    (state?.error?.fieldErrors as Record<string, string[]> | undefined)?.[field]?.[0]

  async function handleSpotifyImport() {
    if (!spotifyImportUrl.trim()) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/spotify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: spotifyImportUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.needsAuth ? 'Conecte o Spotify primeiro em Configurações.' : (data.error ?? 'Erro ao importar.'))
        return
      }
      if (data.title)    setTitle(data.title)
      if (data.artist)   setArtist(data.artist)
      setSpotifyArtistId(data.spotifyArtistId ?? '')
      setSpotifyArtistName(data.spotifyArtistName ?? data.artist ?? '')
      setSpotifyPlaylistId(data.spotifyPlaylistId ?? '')
      if (data.coverUrl) { setCoverUrl(data.coverUrl); setImportedCover(data.coverUrl) }
      if (data.spotifyUrl) {
        setPlatforms((current) => current.map((platform) =>
          platform.name === 'spotify' ? { ...platform, url: data.spotifyUrl, isActive: true } : platform
        ))
      }
      if (data.title && !slug) {
        setSlug(
          data.title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50)
        )
      }
    } catch {
      setImportError('Falha de rede. Tente novamente.')
    } finally {
      setImporting(false)
    }
  }

  const selectedTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  function movePlatform(fromName: string, toName: string) {
    setPlatforms((current) => {
      const fromIndex = current.findIndex((item) => item.name === fromName)
      const toIndex = current.findIndex((item) => item.name === toName)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current
      const reordered = [...current]
      const [item] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, item)
      return reordered
    })
  }

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      <input type="hidden" name="spotifyArtistId" value={spotifyArtistId} />
      <input type="hidden" name="spotifyArtistName" value={spotifyArtistName} />
      <input type="hidden" name="spotifyPlaylistId" value={spotifyPlaylistId} />
      {platforms.map((platform, order) => (
        <span key={platform.name}>
          <input type="hidden" name={`order_${platform.name}`} value={order} />
          <input type="hidden" name={`active_${platform.name}`} value={String(platform.isActive)} />
        </span>
      ))}
      {chosenPixels.map((pixelId) => (
        <input key={pixelId} type="hidden" name="pixelIds" value={pixelId} />
      ))}
      {chosenArtists.map((artistId) => (
        <input key={artistId} type="hidden" name="artistIds" value={artistId} />
      ))}
      {state?.error?.formErrors?.map((msg) => (
        <div key={msg} className="bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3 text-red-400 text-sm">
          {msg}
        </div>
      ))}

      {/* Importar do Spotify */}
      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎧</span>
          <h2 className="font-semibold text-white">Importar do Spotify</h2>
          {!hasSpotify && (
            <a href="/settings" className="ml-auto text-xs text-accent hover:underline">
              Conectar Spotify →
            </a>
          )}
        </div>
        <p className="text-xs text-muted">Cole a URL de uma faixa, álbum ou playlist para preencher nome e capa automaticamente.</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={spotifyImportUrl}
            onChange={(e) => setSpotifyImportUrl(e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className="input flex-1"
            disabled={!hasSpotify || importing}
          />
          <button
            type="button"
            onClick={handleSpotifyImport}
            disabled={!hasSpotify || importing || !spotifyImportUrl.trim()}
            className="btn-secondary whitespace-nowrap"
          >
            {importing ? 'Buscando…' : 'Importar'}
          </button>
        </div>
        {importError && <p className="text-xs text-red-400">{importError}</p>}
        {importedCover && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={importedCover} alt="capa" className="w-12 h-12 rounded-lg object-cover" />
            <span className="text-xs text-green-400">✓ Dados importados do Spotify</span>
          </div>
        )}
      </section>

      {/* Dados do link */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-white">Dados do link</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="title">Título *</label>
            <input
              id="title" name="title" type="text" required maxLength={100}
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="input" placeholder="Nome da música ou playlist"
            />
            {fieldError('title') && <p className="field-error">{fieldError('title')}</p>}
          </div>
          {spotifyArtistId && spotifyArtistName && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
              Artist &apos;{spotifyArtistName}&apos; will be created with Spotify data when smartlink is saved.
            </div>
          )}
          <div>
            <label className="label" htmlFor="artist">Artista / Label</label>
            <input
              id="artist" name="artist" type="text" maxLength={100}
              value={artist} onChange={(e) => setArtist(e.target.value)}
              className="input" placeholder="Nome do artista ou gravadora"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="slug">Link público *</label>
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs whitespace-nowrap">trackscale.app/l/</span>
            <input
              id="slug" name="slug" type="text" required maxLength={50}
              value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input" placeholder="minha-playlist"
            />
          </div>
          {fieldError('slug') && <p className="field-error">{fieldError('slug')}</p>}
        </div>

        <div>
          <label className="label" htmlFor="coverUrl">URL da capa</label>
          <input
            id="coverUrl" name="coverUrl" type="url" maxLength={2048}
            value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
            className="input" placeholder="https://... (preenchido via Spotify)"
          />
        </div>
      </section>

      {/* Tema da landing page */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-white">Tema da landing page</h2>
          <p className="text-xs text-muted mt-1">Fundo que o visitante vai ver ao abrir o link.</p>
        </div>

        <input type="hidden" name="theme" value={theme} />

        <div className="flex flex-wrap gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-12 h-12 rounded-xl transition-all"
                style={{
                  backgroundColor: t.bg,
                  border: theme === t.id
                    ? `2px solid ${t.ring}`
                    : '2px solid #2a2a3a',
                  boxShadow: theme === t.id ? `0 0 12px ${t.ring}60` : 'none',
                  transform: theme === t.id ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              <span className="text-xs" style={{ color: theme === t.id ? '#ccc' : '#666' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: selectedTheme.bg, border: `1px solid ${selectedTheme.ring}30` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0"
            style={{ backgroundColor: selectedTheme.ring + '30' }}
          />
          <div>
            <p className="text-white text-sm font-medium">{title || 'Título do link'}</p>
            <p className="text-xs" style={{ color: '#8888aa' }}>{artist || 'Artista'}</p>
          </div>
        </div>
      </section>

      {/* Destinos de streaming */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-semibold text-white">Links de destino</h2>
          <p className="text-xs text-muted mt-1">Para onde o usuário vai ao clicar. Preencha ao menos um.</p>
        </div>
        {platforms.map((platform, index) => (
          <div
            key={platform.name}
            draggable
            onDragStart={() => setDraggingPlatform(platform.name)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggingPlatform) movePlatform(draggingPlatform, platform.name)
              setDraggingPlatform(null)
            }}
            onDragEnd={() => setDraggingPlatform(null)}
            className={`rounded-lg border border-border p-3 space-y-2 ${draggingPlatform === platform.name ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Drag ${platform.label} to reorder`}
                title="Arraste para reordenar"
                className="cursor-grab px-2 text-muted active:cursor-grabbing"
              >
                ⠿
              </button>
              <span className="flex-1 text-sm font-medium">{platform.label}</span>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={index === 0}
                onClick={() => movePlatform(platform.name, platforms[index - 1]?.name)}
                aria-label={`Move ${platform.label} up`}
              >↑</button>
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={index === platforms.length - 1}
                onClick={() => movePlatform(platform.name, platforms[index + 1]?.name)}
                aria-label={`Move ${platform.label} down`}
              >↓</button>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={platform.isActive}
                  onChange={(event) => setPlatforms((items) => items.map((item) =>
                    item.name === platform.name ? { ...item, isActive: event.target.checked } : item
                  ))}
                />
                Ativo
              </label>
            </div>
            <label className="sr-only" htmlFor={platform.name}>{platform.label} URL</label>
            <input
              id={platform.name} name={platform.name} type="url" maxLength={2048}
              value={platform.url}
              onChange={(event) => setPlatforms((items) => items.map((item) =>
                item.name === platform.name ? { ...item, url: event.target.value } : item
              ))}
              className="input" placeholder={platform.placeholder}
            />
            <input
              name={`deeplink_${platform.name}`}
              type="url"
              maxLength={2048}
              value={platform.deeplinkUrl}
              onChange={(event) => setPlatforms((items) => items.map((item) =>
                item.name === platform.name ? { ...item, deeplinkUrl: event.target.value } : item
              ))}
              className="input text-xs"
              placeholder="Deeplink direto (opcional)"
              aria-label={`${platform.label} deeplink`}
            />
          </div>
        ))}
        {fieldError('platforms') && <p className="field-error">{fieldError('platforms')}</p>}
      </section>

      <section className="card space-y-3 border-purple-900/30">
        <h2 className="font-semibold text-sm text-white">Data Connections</h2>
        {artists.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted">Assigned artists</p>
            {artists.map((artistOption) => (
              <label key={artistOption.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenArtists.includes(artistOption.id)}
                  onChange={(event) => setChosenArtists((ids) =>
                    event.target.checked
                      ? [...ids, artistOption.id]
                      : ids.filter((id) => id !== artistOption.id)
                  )}
                />
                <span>{artistOption.name}</span>
              </label>
            ))}
          </div>
        )}
        {pixels.length ? (
          <div className="space-y-2">
            {pixels.map((pixel) => (
              <label key={pixel.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosenPixels.includes(pixel.id)}
                  onChange={(event) => setChosenPixels((ids) =>
                    event.target.checked ? [...ids, pixel.id] : ids.filter((id) => id !== pixel.id)
                  )}
                />
                <span>{pixel.name}</span>
                <span className="font-mono text-xs text-muted">••••{pixel.metaPixelId.slice(-4)}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhum pixel cadastrado. <Link href="/tracking" className="text-accent hover:underline">Adicionar em Tracking</Link></p>
        )}
        <Link href="/tracking" className="text-xs text-accent hover:underline">Gerenciar pixels →</Link>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="btn-ghost">Descartar rascunho</Link>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Salvando…' : label}
    </button>
  )
}

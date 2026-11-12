'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import type { LinkFormState } from '@/app/(dashboard)/links/actions'
import SmartLinkVisual, { type LinkCustomization } from '@/components/SmartLinkVisual'

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
    customization?: LinkCustomization
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
  { id: 'dark-navy',   label: 'Navy',    bg: '#0b0b18', card: '#14142a', border: '#20203a', ring: '#4040a0' },
  { id: 'dark-purple', label: 'Purple',   bg: '#0d0616', card: '#180e2a', border: '#261840', ring: '#7040a0' },
  { id: 'midnight',    label: 'Black',    bg: '#070709', card: '#111116', border: '#1c1c24', ring: '#505050' },
  { id: 'forest',      label: 'Forest',   bg: '#050e06', card: '#0c1a0d', border: '#14281a', ring: '#205020' },
  { id: 'ocean',       label: 'Ocean',    bg: '#030c17', card: '#081524', border: '#0f2236', ring: '#205080' },
  { id: 'crimson',     label: 'Wine',     bg: '#0e0408', card: '#1a080d', border: '#2a1018', ring: '#802040' },
]

const ACCENT_PRESETS = [
  { color: '#7c3aed', label: 'Purple' },
  { color: '#2563eb', label: 'Blue' },
  { color: '#059669', label: 'Green' },
  { color: '#dc2626', label: 'Red' },
  { color: '#d97706', label: 'Orange' },
  { color: '#db2777', label: 'Pink' },
]

const BUTTON_STYLES = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'pill',    label: 'Pill' },
  { id: 'square',  label: 'Square' },
] as const

const COVER_SIZES = [
  { id: 'lg',     label: 'Large' },
  { id: 'sm',     label: 'Small' },
  { id: 'hidden', label: 'Hidden' },
] as const

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
  const [connectionTab, setConnectionTab] = useState<'artists' | 'pixels'>('artists')
  const [draggingPlatform, setDraggingPlatform] = useState<string | null>(null)

  // Customization state
  const [accentColor, setAccentColor] = useState(defaultValues?.customization?.accentColor ?? '#7c3aed')
  const [customAccent, setCustomAccent] = useState(!ACCENT_PRESETS.some(p => p.color === (defaultValues?.customization?.accentColor ?? '#7c3aed')))
  const [buttonStyle, setButtonStyle] = useState<'pill' | 'rounded' | 'square'>(defaultValues?.customization?.buttonStyle ?? 'rounded')
  const [coverSize, setCoverSize] = useState<'lg' | 'sm' | 'hidden'>(defaultValues?.customization?.coverSize ?? 'lg')
  const [showVerified, setShowVerified] = useState(defaultValues?.customization?.showVerified ?? false)
  const [bioText, setBioText] = useState(defaultValues?.customization?.bioText ?? '')
  const [bgStyle, setBgStyle] = useState<'solid' | 'album-blur'>(defaultValues?.customization?.bgStyle ?? 'solid')

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
        setImportError(data.needsAuth ? 'Connect Spotify first in Settings.' : (data.error ?? 'Import error.'))
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
      setImportError('Network error. Please try again.')
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

  const customization: LinkCustomization = {
    accentColor,
    buttonStyle,
    coverSize,
    showVerified,
    bioText: bioText || undefined,
    bgStyle,
  }

  const previewPlatforms = platforms.filter((p) => p.url && p.isActive).map((p) => ({ name: p.name, url: p.url }))

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      {/* ── Form column ── */}
      <form action={formAction} className="space-y-5 w-full xl:max-w-xl flex-1 min-w-0">
        <input type="hidden" name="spotifyArtistId" value={spotifyArtistId} />
        <input type="hidden" name="spotifyArtistName" value={spotifyArtistName} />
        <input type="hidden" name="spotifyPlaylistId" value={spotifyPlaylistId} />
        <input type="hidden" name="customization" value={JSON.stringify(customization)} />
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
            <h2 className="font-semibold text-white">Import from Spotify</h2>
            {!hasSpotify && (
              <a href="/settings" className="ml-auto text-xs text-accent hover:underline">
                Connect Spotify →
              </a>
            )}
          </div>
          <p className="text-xs text-muted">Paste a track, album or playlist URL to fill name and cover automatically.</p>
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
              {importing ? 'Searching…' : 'Import'}
            </button>
          </div>
          {importError && <p className="text-xs text-red-400">{importError}</p>}
          {importedCover && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={importedCover} alt="capa" className="w-12 h-12 rounded-lg object-cover" />
              <span className="text-xs text-green-400">✓ Data imported from Spotify</span>
            </div>
          )}
        </section>

        {/* Dados do link */}
        <section className="card space-y-4">
          <h2 className="font-semibold text-white">Link details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="title">Title *</label>
              <input
                id="title" name="title" type="text" required maxLength={100}
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="input" placeholder="Track or playlist name"
              />
              {fieldError('title') && <p className="field-error">{fieldError('title')}</p>}
            </div>
            {spotifyArtistId && spotifyArtistName && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
                Artist &apos;{spotifyArtistName}&apos; will be created with Spotify data when smartlink is saved.
              </div>
            )}
            <div>
              <label className="label" htmlFor="artist">Artist / Label</label>
              <input
                id="artist" name="artist" type="text" maxLength={100}
                value={artist} onChange={(e) => setArtist(e.target.value)}
                className="input" placeholder="Artist or label name"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="slug">Public URL *</label>
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs whitespace-nowrap">trackscaler.com/</span>
              <input
                id="slug" name="slug" type="text" required maxLength={50}
                value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input" placeholder="minha-playlist"
              />
            </div>
            {fieldError('slug') && <p className="field-error">{fieldError('slug')}</p>}
          </div>

          <div>
            <label className="label" htmlFor="coverUrl">Cover URL</label>
            <input
              id="coverUrl" name="coverUrl" type="url" maxLength={2048}
              value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
              className="input" placeholder="https://... (preenchido via Spotify)"
            />
          </div>
        </section>

        {/* Tema */}
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold text-white">Theme</h2>
            <p className="text-xs text-muted mt-1">Background the visitor sees when opening the link.</p>
          </div>
          <input type="hidden" name="theme" value={theme} />
          <div className="flex flex-wrap gap-3">
            {THEMES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} className="flex flex-col items-center gap-1.5 group">
                <div
                  className="w-12 h-12 rounded-xl transition-all"
                  style={{
                    backgroundColor: t.bg,
                    border: theme === t.id ? `2px solid ${t.ring}` : '2px solid #2a2a3a',
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
        </section>

        {/* Aparência */}
        <section className="card space-y-5">
          <div>
            <h2 className="font-semibold text-white">Appearance</h2>
            <p className="text-xs text-muted mt-1">Accent color, buttons and visual details.</p>
          </div>

          {/* Accent color */}
          <div className="space-y-2">
            <p className="label">Accent color</p>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  title={preset.label}
                  onClick={() => { setAccentColor(preset.color); setCustomAccent(false) }}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    backgroundColor: preset.color,
                    outline: accentColor === preset.color && !customAccent ? `3px solid ${preset.color}` : '3px solid transparent',
                    outlineOffset: '2px',
                    opacity: accentColor === preset.color && !customAccent ? 1 : 0.6,
                    transform: accentColor === preset.color && !customAccent ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
              <label
                className="w-8 h-8 rounded-full overflow-hidden cursor-pointer transition-all"
                title="Custom color"
                style={{
                  outline: customAccent ? `3px solid ${accentColor}` : '3px solid transparent',
                  outlineOffset: '2px',
                  transform: customAccent ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => { setAccentColor(e.target.value); setCustomAccent(true) }}
                  className="w-10 h-10 -m-1 cursor-pointer opacity-100"
                />
              </label>
            </div>
          </div>

          {/* Button style */}
          <div className="space-y-2">
            <p className="label">Button style</p>
            <div className="flex gap-2">
              {BUTTON_STYLES.map((style) => {
                const radius = style.id === 'pill' ? 24 : style.id === 'rounded' ? 10 : 4
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setButtonStyle(style.id)}
                    className="flex-1 flex flex-col items-center gap-2 py-3 px-2 transition-all"
                    style={{
                      backgroundColor: buttonStyle === style.id ? '#1e1e3a' : 'transparent',
                      border: `1px solid ${buttonStyle === style.id ? '#4040a0' : '#2a2a3a'}`,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 48, height: 20, borderRadius: radius,
                        backgroundColor: buttonStyle === style.id ? accentColor + '40' : '#2a2a3a',
                        border: `1px solid ${buttonStyle === style.id ? accentColor : '#3a3a5a'}`,
                      }}
                    />
                    <span className="text-xs" style={{ color: buttonStyle === style.id ? '#ccc' : '#555' }}>
                      {style.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cover size */}
          <div className="space-y-2">
            <p className="label">Cover size</p>
            <div className="flex gap-2">
              {COVER_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setCoverSize(size.id)}
                  className="flex-1 py-2 px-3 text-xs transition-all rounded-lg"
                  style={{
                    backgroundColor: coverSize === size.id ? '#1e1e3a' : 'transparent',
                    border: `1px solid ${coverSize === size.id ? '#4040a0' : '#2a2a3a'}`,
                    color: coverSize === size.id ? '#ccc' : '#555',
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background style */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Album cover blur background</p>
              <p className="text-xs text-muted mt-0.5">Uses the album image as background with glass effect</p>
            </div>
            <button
              type="button"
              onClick={() => setBgStyle((v) => v === 'album-blur' ? 'solid' : 'album-blur')}
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ backgroundColor: bgStyle === 'album-blur' ? accentColor : '#2a2a3a' }}
              role="switch"
              aria-checked={bgStyle === 'album-blur'}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                style={{ transform: bgStyle === 'album-blur' ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Show verified badge */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Verification badge</p>
              <p className="text-xs text-muted mt-0.5">Show &quot;real traffic&quot; badge when verified</p>
            </div>
            <button
              type="button"
              onClick={() => setShowVerified((v) => !v)}
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ backgroundColor: showVerified ? accentColor : '#2a2a3a' }}
              role="switch"
              aria-checked={showVerified}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                style={{ transform: showVerified ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Bio text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="bioText">Bio / Description</label>
              <span className="text-xs text-muted">{bioText.length}/120</span>
            </div>
            <textarea
              id="bioText"
              value={bioText}
              onChange={(e) => setBioText(e.target.value.slice(0, 120))}
              className="input resize-none"
              rows={2}
              placeholder="Text shown below the artist name (optional)"
              maxLength={120}
            />
          </div>
        </section>

        {/* Destinos de streaming */}
        <section className="card space-y-4">
          <div>
            <h2 className="font-semibold text-white">Destination links</h2>
            <p className="text-xs text-muted mt-1">Where the user goes when they click. Fill in at least one.</p>
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
                <button type="button" aria-label={`Drag ${platform.label} to reorder`} title="Drag to reorder" className="cursor-grab px-2 text-muted active:cursor-grabbing">⠿</button>
                <span className="flex-1 text-sm font-medium">{platform.label}</span>
                <button type="button" className="btn-ghost text-xs" disabled={index === 0} onClick={() => movePlatform(platform.name, platforms[index - 1]?.name)} aria-label={`Move ${platform.label} up`}>↑</button>
                <button type="button" className="btn-ghost text-xs" disabled={index === platforms.length - 1} onClick={() => movePlatform(platform.name, platforms[index + 1]?.name)} aria-label={`Move ${platform.label} down`}>↓</button>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={platform.isActive}
                    onChange={(event) => setPlatforms((items) => items.map((item) =>
                      item.name === platform.name ? { ...item, isActive: event.target.checked } : item
                    ))}
                  />
                  Active
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
                value={platform.deeplinkUrl ?? ''}
                onChange={(event) => setPlatforms((items) => items.map((item) =>
                  item.name === platform.name ? { ...item, deeplinkUrl: event.target.value } : item
                ))}
                className="input text-xs"
                placeholder="Direct deeplink (optional)"
                aria-label={`${platform.label} deeplink`}
              />
            </div>
          ))}
          {fieldError('platforms') && <p className="field-error">{fieldError('platforms')}</p>}
        </section>

        <section className="card space-y-3 border-purple-900/30">
          <h2 className="font-semibold text-sm text-white">Data Connections</h2>
          <div role="tablist" className="flex gap-1 border-b border-purple-900/30">
            {([
              ['artists', `Artists (${chosenArtists.length})`],
              ['pixels', `Pixels (${chosenPixels.length})`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={connectionTab === id}
                onClick={() => setConnectionTab(id)}
                className={`px-3 py-2 text-xs -mb-px border-b-2 transition-colors ${
                  connectionTab === id ? 'border-purple-500 text-white' : 'border-transparent text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {connectionTab === 'artists' && (
            artists.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted">Assigned artists</p>
                {artists.map((artistOption) => (
                  <label key={artistOption.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={chosenArtists.includes(artistOption.id)}
                      onChange={(event) => setChosenArtists((ids) =>
                        event.target.checked ? [...ids, artistOption.id] : ids.filter((id) => id !== artistOption.id)
                      )}
                    />
                    <span>{artistOption.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No artists yet. <Link href="/artists" className="text-accent hover:underline">Add in Artists</Link></p>
            )
          )}

          {connectionTab === 'pixels' && (
            pixels.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted">Assigned pixels</p>
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
              <p className="text-sm text-muted">No pixels added. <Link href="/tracking" className="text-accent hover:underline">Add in Tracking</Link></p>
            )
          )}
          <Link href="/tracking" className="text-xs text-accent hover:underline">Manage pixels →</Link>
        </section>

        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="btn-ghost">Discard draft</Link>
          <SubmitButton label={submitLabel} />
        </div>
      </form>

      {/* ── Live Preview column ── */}
      <div className="hidden xl:block w-[300px] flex-shrink-0">
        <div className="sticky top-6">
          <p className="text-xs text-muted text-center mb-3 font-medium tracking-wide uppercase">Preview</p>
          {/* Phone shell */}
          <div
            className="mx-auto"
            style={{
              width: 280,
              backgroundColor: '#0a0a0a',
              borderRadius: 44,
              padding: 10,
              boxShadow: '0 0 0 1px #222, 0 32px 80px rgba(0,0,0,0.6), inset 0 0 0 1px #333',
            }}
          >
            {/* Notch */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <div style={{ width: 80, height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 }} />
            </div>
            {/* Screen */}
            <div
              style={{
                width: 260,
                height: 556,
                borderRadius: 34,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Scale wrapper: SmartLinkVisual is designed for ~390px wide, scale to 260px */}
              <div
                style={{
                  width: 390,
                  transformOrigin: 'top left',
                  transform: 'scale(0.6666)',
                  height: 'calc(556px / 0.6666)',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                <SmartLinkVisual
                  title={title}
                  artist={artist}
                  coverUrl={coverUrl || undefined}
                  platforms={previewPlatforms.length > 0 ? previewPlatforms : [{ name: 'spotify' }, { name: 'apple_music' }]}
                  theme={{
                    bg: selectedTheme.bg,
                    card: selectedTheme.card,
                    border: selectedTheme.border,
                  }}
                  customization={customization}
                />
              </div>
            </div>
            {/* Home bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <div style={{ width: 100, height: 4, backgroundColor: '#333', borderRadius: 2 }} />
            </div>
          </div>
          <p className="text-xs text-muted text-center mt-3">Updates in real time</p>
        </div>
      </div>
    </div>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? 'Saving…' : label}
    </button>
  )
}

'use client'

import { useState } from 'react'
import LinkForm from './LinkForm'
import type { LinkFormState } from '@/app/(dashboard)/links/actions'

interface PixelOption { id: string; name: string; metaPixelId: string }
interface ArtistOption { id: string; name: string }

interface ResolvedData {
  title: string | null
  artist: string | null
  artists: Array<{ name: string; id: string }>
  coverUrl: string | null
  suggestedSlug: string | null
  spotifyPlaylistId: string | null
  spotifyArtistId: string | null
  spotifyArtistName: string | null
  platformUrls: Partial<Record<string, string>>
  resolvedCount: number
}

interface ResolveLinkFlowProps {
  action: (prev: LinkFormState, formData: FormData) => Promise<LinkFormState>
  hasSpotify: boolean
  pixels: PixelOption[]
  artists: ArtistOption[]
}

type PlatformStatus = 'pending' | 'resolved' | 'unavailable'

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  spotify:       { label: 'Spotify',       color: '#1DB954' },
  apple_music:   { label: 'Apple Music',   color: '#fc3c44' },
  youtube_music: { label: 'YouTube Music', color: '#FF0000' },
  deezer:        { label: 'Deezer',        color: '#A238FF' },
}

const PLATFORM_ORDER = ['spotify', 'apple_music', 'youtube_music', 'deezer']

export default function ResolveLinkFlow({ action, hasSpotify, pixels, artists }: ResolveLinkFlowProps) {
  const [step, setStep] = useState<'url' | 'loading' | 'form'>('url')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<ResolvedData | null>(null)
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({})
  const [artistWasCreated, setArtistWasCreated] = useState<string | null>(null)

  async function handleResolve() {
    if (!url.trim()) return
    setError(null)
    setStep('loading')
    setPlatformStatuses(Object.fromEntries(PLATFORM_ORDER.map((p) => [p, 'pending'])))

    try {
      const res = await fetch('/api/links/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Não foi possível resolver este link.')
        setStep('url')
        return
      }

      setResolved(data as ResolvedData)

      // Anima plataformas acendendo uma a uma
      PLATFORM_ORDER.forEach((platform, i) => {
        setTimeout(() => {
          setPlatformStatuses((prev) => ({
            ...prev,
            [platform]: data.platformUrls?.[platform] ? 'resolved' : 'unavailable',
          }))
        }, i * 250)
      })

      // Avança para o form após as animações
      setTimeout(() => {
        if (data.spotifyArtistName) setArtistWasCreated(data.spotifyArtistName)
        setStep('form')
      }, PLATFORM_ORDER.length * 250 + 400)
    } catch {
      setError('Falha de rede. Tente novamente.')
      setStep('url')
    }
  }

  if (step === 'form') {
    const platformDefaults = resolved
      ? PLATFORM_ORDER
          .filter((p) => resolved.platformUrls[p])
          .map((name, order) => ({
            name,
            url: resolved.platformUrls[name]!,
            order,
            isActive: true,
          }))
      : []

    return (
      <div className="space-y-4">
        {artistWasCreated && (
          <div className="bg-accent/10 border border-accent/25 rounded-lg px-4 py-3 text-accent text-sm flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Artist &apos;{artistWasCreated}&apos; will be created with Spotify data when smartlink is saved.
          </div>
        )}
        <LinkForm
          action={action}
          submitLabel="Salvar e publicar"
          hasSpotify={hasSpotify}
          pixels={pixels}
          artists={artists}
          defaultValues={{
            title: resolved?.title ?? '',
            artist: resolved?.artist ?? '',
            slug: resolved?.suggestedSlug ?? '',
            coverUrl: resolved?.coverUrl ?? '',
            spotifyArtistId: resolved?.spotifyArtistId ?? '',
            spotifyArtistName: resolved?.spotifyArtistName ?? '',
            spotifyPlaylistId: resolved?.spotifyPlaylistId ?? '',
            platforms: platformDefaults,
          }}
        />
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="card max-w-md mx-auto space-y-6 py-10">
        <div className="text-center space-y-1">
          <p className="text-white font-semibold">Resolvendo link…</p>
          <p className="text-muted text-sm">Buscando em todas as plataformas</p>
        </div>

        <div className="space-y-3">
          {PLATFORM_ORDER.map((platform) => {
            const cfg = PLATFORM_LABELS[platform]
            const status = platformStatuses[platform] ?? 'pending'
            return (
              <div key={platform} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor:
                      status === 'resolved'
                        ? cfg.color
                        : status === 'unavailable'
                        ? '#333'
                        : '#444',
                    boxShadow: status === 'resolved' ? `0 0 8px ${cfg.color}80` : 'none',
                  }}
                />
                <span
                  className="text-sm transition-colors duration-300"
                  style={{
                    color: status === 'resolved' ? '#f8f8f8' : status === 'unavailable' ? '#444' : '#666',
                  }}
                >
                  {cfg.label}
                </span>
                {status === 'pending' && (
                  <svg className="ml-auto w-3.5 h-3.5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10"/>
                  </svg>
                )}
                {status === 'resolved' && (
                  <svg className="ml-auto w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {status === 'unavailable' && (
                  <span className="ml-auto text-xs text-muted/50">—</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Step: url input
  return (
    <div className="card max-w-md mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Cole o link da música</h2>
        <p className="text-sm text-muted">
          Spotify, Apple Music, YouTube Music ou Deezer — resolve automaticamente em todas as plataformas.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
          placeholder="https://open.spotify.com/track/..."
          className="input"
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleResolve}
          disabled={!url.trim()}
          className="btn-primary w-full"
        >
          Resolver link
        </button>
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setStep('form')}
          className="btn-ghost w-full text-sm"
        >
          Preencher manualmente →
        </button>
      </div>
    </div>
  )
}

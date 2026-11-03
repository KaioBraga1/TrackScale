'use client'

import React from 'react'

interface Platform {
  name: string
  url?: string
}

interface Theme {
  bg: string
  card: string
  border: string
}

export interface LinkCustomization {
  accentColor?: string
  buttonStyle?: 'pill' | 'rounded' | 'square'
  coverSize?: 'lg' | 'sm' | 'hidden'
  showVerified?: boolean
  bioText?: string
  bgStyle?: 'solid' | 'album-blur'
}

interface SmartLinkVisualProps {
  title: string
  artist?: string
  coverUrl?: string
  platforms: Platform[]
  theme: Theme
  customization?: LinkCustomization
}

const SpotifyIcon = (
  <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.17 14.524a.625.625 0 01-.86.208c-2.353-1.438-5.315-1.763-8.803-.966a.625.625 0 01-.278-1.219c3.815-.872 7.09-.497 9.733 1.117.295.181.387.565.208.86zm1.115-2.702a.782.782 0 01-1.075.257c-2.693-1.655-6.797-2.135-9.984-1.168a.782.782 0 01-.454-1.496c3.64-1.105 8.163-.57 11.256 1.332a.782.782 0 01.257 1.075zm.096-2.813c-3.232-1.919-8.564-2.095-11.646-1.158a.938.938 0 01-.544-1.797C8.7 6.817 14.527 7.014 18.203 9.18a.938.938 0 01-.922 1.629z"/>
  </svg>
)

const AppleIcon = (
  <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const YouTubeIcon = (
  <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
    <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2-.9C17.2 5 12 5 12 5s-5.2 0-7 .1c-.4 0-1.3.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.8C6.8 19 12 19 12 19s5.2 0 7-.2c.4 0 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.3l5.6 2.6-5.6 2.6z"/>
  </svg>
)

const DeezerIcon = (
  <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
    <rect x="2" y="15" width="3" height="7" rx="1"/>
    <rect x="7" y="11" width="3" height="11" rx="1"/>
    <rect x="12" y="7" width="3" height="15" rx="1"/>
    <rect x="17" y="3" width="3" height="19" rx="1"/>
  </svg>
)

const PLATFORM_CONFIG: Record<string, { label: string; iconBg: string; icon: React.ReactNode }> = {
  spotify:       { label: 'Ouvir no Spotify',        iconBg: '#1DB954',                                   icon: SpotifyIcon },
  apple_music:   { label: 'Ouvir na Apple Music',    iconBg: 'linear-gradient(135deg, #fc3c44, #f9148b)', icon: AppleIcon },
  youtube_music: { label: 'Ouvir no YouTube Music',  iconBg: '#FF0000',                                   icon: YouTubeIcon },
  deezer:        { label: 'Ouvir no Deezer',         iconBg: 'linear-gradient(135deg, #A238FF, #7B2BCC)', icon: DeezerIcon },
}

const COVER_SIZES: Record<string, { width: number; height: number }> = {
  lg: { width: 208, height: 208 },
  sm: { width: 120, height: 120 },
}

const BUTTON_RADIUS: Record<string, string> = {
  pill:    '9999px',
  rounded: '16px',
  square:  '8px',
}

export default function SmartLinkVisual({
  title,
  artist,
  coverUrl,
  platforms,
  theme,
  customization,
}: SmartLinkVisualProps) {
  const accent      = customization?.accentColor ?? '#7c3aed'
  const btnRadius   = BUTTON_RADIUS[customization?.buttonStyle ?? 'rounded']
  const coverSize   = customization?.coverSize ?? 'lg'
  const showVerified = customization?.showVerified ?? false
  const bioText     = customization?.bioText ?? ''
  const bgStyle     = customization?.bgStyle ?? 'solid'
  const useAlbumBg  = bgStyle === 'album-blur' && !!coverUrl

  const visiblePlatforms = platforms.filter((p) => p.name in PLATFORM_CONFIG)

  return (
    <div style={{ backgroundColor: useAlbumBg ? 'transparent' : theme.bg, minHeight: '100%', position: 'relative', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {/* Album blur background */}
      {useAlbumBg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.28) saturate(1.6)',
          transform: 'scale(1.15)',
        }} />
      )}
      {/* Dark overlay so content stays readable */}
      {useAlbumBg && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
      )}
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse, ${accent}20 0%, transparent 70%)`,
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 32, paddingBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em' }}>TrackScale</span>
      </div>

      {/* Album cover */}
      {coverSize !== 'hidden' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: COVER_SIZES[coverSize].width,
            height: COVER_SIZES[coverSize].height,
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: theme.card,
            boxShadow: coverUrl ? '0 16px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' : '0 8px 32px rgba(0,0,0,0.4)',
            flexShrink: 0,
          }}>
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 36, height: 36, color: theme.border }}>
                  <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeWidth="1.5" stroke={theme.border} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title + artist + bio */}
      <div style={{ textAlign: 'center', padding: '16px 20px 8px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          {title || 'Título da música'}
        </h2>
        {(artist || !title) && (
          <p style={{ color: '#b8b8d0', fontSize: 15, marginTop: 4 }}>
            {artist || 'Artista'}
          </p>
        )}
        {bioText && (
          <p style={{ color: '#9999bb', fontSize: 13, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
            {bioText}
          </p>
        )}
      </div>

      {/* Platform buttons */}
      <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
        {showVerified && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 9999,
            backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
            width: 'fit-content', margin: '0 auto 2px',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none">
              <path d="M12 2L3 6.5V12c0 5 3.8 9.3 9 10.3C18.2 21.3 22 17 22 12V6.5L12 2z" stroke="#10b981" strokeWidth="1.5" fill="rgba(16,185,129,0.15)"/>
              <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: '#10b981', fontSize: 11, fontWeight: 500 }}>Verificado · tráfego real</span>
          </div>
        )}

        {visiblePlatforms.length > 0 ? visiblePlatforms.map((platform) => {
          const cfg = PLATFORM_CONFIG[platform.name]
          return (
            <div
              key={platform.name}
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: btnRadius,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cfg.icon}
              </div>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 15, flex: 1 }}>{cfg.label}</span>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none">
                <path d="M9 18l6-6-6-6" stroke="#666688" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )
        }) : (
          <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: btnRadius, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.border, flexShrink: 0 }} />
            <span style={{ color: '#4444aa', fontSize: 13 }}>Adicione plataformas →</span>
          </div>
        )}
      </div>

      {/* Consent banner */}
      <div style={{ margin: '12px 16px 8px', backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '10px 12px', position: 'relative', zIndex: 1 }}>
        <p style={{ color: '#bbbbdd', fontSize: 11, marginBottom: 8, lineHeight: 1.5 }}>
          Ajude a medir visitas e campanhas. Sua escolha não altera o acesso à música.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, backgroundColor: accent, borderRadius: 8, padding: '6px 0', textAlign: 'center', fontSize: 10, color: 'white', fontWeight: 600 }}>Aceitar</div>
          <div style={{ flex: 1, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '6px 0', textAlign: 'center', fontSize: 10, color: '#aaaacc' }}>Recusar</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0 24px', position: 'relative', zIndex: 1 }}>
        <p style={{ color: '#60607a', fontSize: 11 }}>Powered by TrackScale</p>
      </div>
    </div>
  )
}

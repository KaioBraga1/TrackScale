'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Platform {
  name: string
  url: string
  deeplinkUrl?: string | null
}

interface Theme {
  bg: string
  card: string
  border: string
}

interface SmartLinkProps {
  linkId: string
  slug: string
  platforms: Platform[]
  metaPixelIds: string[]
  theme: Theme
}

type ConsentStatus = 'PENDING' | 'GRANTED' | 'DENIED'
type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[][]
  loaded?: boolean
  version?: string
}

const CONSENT_STORAGE_KEY = 'trackscale_consent_v1'

declare global {
  interface Window {
    __trackscale?: {
      collect: () => {
        fingerprint: string | null
        humanScoreClient: number
      }
    }
    fbq?: MetaPixelFunction
  }
}

export default function SmartLink({ slug, platforms, metaPixelIds, theme }: SmartLinkProps) {
  const trackedRef = useRef(false)
  const visitorIdRef = useRef<string | null>(null)
  const viewClickIdRef = useRef<string | null>(null)
  const consentStatusRef = useRef<ConsentStatus>('PENDING')
  const pixelFiredRef = useRef(false)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  // null = verificando, true = humano real, false = filtrado
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('PENDING')
  const [consentPersisted, setConsentPersisted] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)

  const persistConsent = useCallback(async (
    status: ConsentStatus,
    visitorId: string,
    viewClickId?: string
  ) => {
    const response = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        visitorId,
        viewClickId,
        consentStatus: status,
      }),
    })
    if (!response.ok) throw new Error(`Consent request failed (${response.status})`)
    setConsentPersisted(status === 'GRANTED')
    setConsentError(null)
  }, [slug])

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    const clientData = window.__trackscale?.collect?.() ?? {
      fingerprint: null,
      humanScoreClient: 0,
    }
    const utmData = parseUTMParams()
    const params = new URLSearchParams(window.location.search)
    const savedConsent = readConsentStatus()
    consentStatusRef.current = savedConsent
    setConsentStatus(savedConsent)

    // Verifica se já conectou Spotify nesta sessão
    const storedVid = sessionStorage.getItem(`ts_vid_${slug}`)
    if (storedVid) {
      visitorIdRef.current = storedVid
      const isConnected = sessionStorage.getItem(`ts_spotify_${slug}`) === '1'
      setSpotifyConnected(isConnected)
    }

    if (params.get('spotify') === 'connected') {
      setSpotifyConnected(true)
      if (storedVid) sessionStorage.setItem(`ts_spotify_${slug}`, '1')
    }

    const viewPayload = {
      slug,
      eventType: 'LINK_VIEW',
      ...clientData,
      fingerprint: savedConsent === 'GRANTED' ? clientData.fingerprint : null,
      consentStatus: savedConsent,
      visitorId: storedVid ?? null,
      ...utmData,
    }

    fetch('/api/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viewPayload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Tracking request failed (${r.status})`)
        return r.json()
      })
      .then(async (data) => {
        if (data?.visitorId) {
          visitorIdRef.current = data.visitorId
          sessionStorage.setItem(`ts_vid_${slug}`, data.visitorId)
          if (params.get('spotify') === 'connected') {
            sessionStorage.setItem(`ts_spotify_${slug}`, '1')
          }
        }
        if (data?.viewClickId) viewClickIdRef.current = data.viewClickId

        const verified = !data?.isFiltered
        setIsVerified(verified)

        if (savedConsent === 'GRANTED') {
          setConsentPersisted(true)
        } else if (consentStatusRef.current !== savedConsent && data?.visitorId) {
          await persistConsent(
            consentStatusRef.current,
            data.visitorId,
            data.viewClickId
          )
        }
      })
      .catch((err) => {
        console.error('[tracking] verification failed:', err)
        // Falhas de verificação excluem métricas e pixels, mas nunca bloqueiam o redirect.
        setIsVerified(false)
        setConsentPersisted(false)
      })
  }, [persistConsent, slug])

  useEffect(() => {
    if (
      isVerified === true &&
      consentStatus === 'GRANTED' &&
      consentPersisted &&
      metaPixelIds.length > 0 &&
      !pixelFiredRef.current
    ) {
      pixelFiredRef.current = true
      loadMetaPixels(metaPixelIds)
    }
  }, [consentPersisted, consentStatus, isVerified, metaPixelIds])

  async function chooseConsent(status: ConsentStatus) {
    consentStatusRef.current = status
    setConsentStatus(status)
    setConsentPersisted(false)
    setConsentError(null)

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, status)
    } catch (err) {
      console.error('[consent] browser storage unavailable:', err)
      setConsentError('Não foi possível salvar a preferência neste navegador.')
    }

    const visitorId = visitorIdRef.current
    if (!visitorId) return

    try {
      await persistConsent(status, visitorId, viewClickIdRef.current ?? undefined)
    } catch (err) {
      console.error('[consent] save failed:', err)
      setConsentError('Não foi possível salvar sua preferência. Tente novamente.')
    }
  }

  function handlePlatformClick(platformName: string, url: string) {
    try {
      const clientData = window.__trackscale?.collect?.() ?? {
        fingerprint: null,
        humanScoreClient: 0,
      }
      const utmData = parseUTMParams()
      const body = JSON.stringify({
        slug,
        eventType: 'PLATFORM_CLICK',
        platform: platformName,
        visitorId: visitorIdRef.current,
        consentStatus: consentStatusRef.current,
        ...clientData,
        fingerprint: consentStatusRef.current === 'GRANTED' ? clientData.fingerprint : null,
        ...utmData,
      })

      const queued = navigator.sendBeacon?.(
        '/api/click',
        new Blob([body], { type: 'application/json' })
      )
      if (!queued) {
        void fetch('/api/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body,
        }).catch((err) => console.error('[tracking] click request failed:', err))
      }
    } catch (err) {
      console.error('[tracking] could not queue click:', err)
    }

    window.location.assign(url)
  }

  function handleSpotifyConnect() {
    const vid = visitorIdRef.current ?? ''
    window.location.href = `/api/auth/spotify/visitor?slug=${encodeURIComponent(slug)}&visitorId=${encodeURIComponent(vid)}`
  }

  return (
    <div className="w-full space-y-3">
      {/* Badge de tráfego real — aparece após verificação, some se filtrado */}
      {isVerified === true && (
        <div
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full mx-auto w-fit"
          style={{
            backgroundColor: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none">
            <path
              d="M12 2L3 6.5V12c0 5 3.8 9.3 9 10.3C18.2 21.3 22 17 22 12V6.5L12 2z"
              stroke="#10b981"
              strokeWidth="1.5"
              fill="rgba(16,185,129,0.15)"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-medium" style={{ color: '#10b981' }}>
            Verificado · tráfego real
          </span>
        </div>
      )}

      {platforms.map((platform) => {
        const cfg = PLATFORM_CONFIG[platform.name]
        return (
          <button
            key={platform.name}
            onClick={() => handlePlatformClick(platform.name, platform.deeplinkUrl || platform.url)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] hover:brightness-110"
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.border}`,
            }}
          >
            {/* Icon box */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: cfg?.iconBg ?? '#333' }}
            >
              {cfg?.icon}
            </div>

            {/* Label */}
            <span className="flex-1 text-left text-white font-semibold text-[15px]">
              {cfg?.label ?? platform.name}
            </span>

            {/* Chevron */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#666688" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )
      })}

      {consentStatus === 'PENDING' ? (
        <div
          className="mt-4 rounded-xl p-3 space-y-2"
          style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          role="group"
          aria-label="Preferências de privacidade"
        >
          <p className="text-xs leading-relaxed" style={{ color: '#aaaacc' }}>
            Ajude a medir visitas e campanhas. Sua escolha não altera o acesso à música.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void chooseConsent('GRANTED')}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: '#7c3aed' }}
            >
              Aceitar
            </button>
            <button
              type="button"
              onClick={() => void chooseConsent('DENIED')}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium"
              style={{ color: '#aaaacc', border: `1px solid ${theme.border}` }}
            >
              Recusar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void chooseConsent('PENDING')}
          className="w-full mt-3 text-xs underline underline-offset-2"
          style={{ color: '#666688' }}
        >
          Alterar preferências de privacidade
        </button>
      )}
      {consentError && (
        <p role="alert" className="text-xs text-amber-400 text-center">
          {consentError}
        </p>
      )}

      {/* Visitor Spotify connect */}
      {!spotifyConnected ? (
        <button
          onClick={handleSpotifyConnect}
          className="w-full mt-4 text-center text-sm py-2 transition-colors"
          style={{ color: '#666688' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#aaaacc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#666688')}
        >
          Conectar sua conta Spotify
        </button>
      ) : (
        <div className="w-full mt-4 text-center text-sm py-2 flex items-center justify-center gap-1.5" style={{ color: '#10b981' }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Spotify conectado
        </div>
      )}
    </div>
  )
}

function readConsentStatus(): ConsentStatus {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored === 'GRANTED' || stored === 'DENIED') return stored
  } catch (err) {
    console.error('[consent] browser storage unavailable:', err)
  }
  return 'PENDING'
}

function parseUTMParams(): Record<string, string | null> {
  const p = new URLSearchParams(window.location.search)
  return {
    utmSource: p.get('utm_source'),
    utmMedium: p.get('utm_medium'),
    utmCampaign: p.get('utm_campaign'),
    utmContent: p.get('utm_content'),
    utmTerm: p.get('utm_term'),
    fbclid: p.get('fbclid'),
    gclid: p.get('gclid'),
  }
}

function loadMetaPixels(pixelIds: string[]) {
  const initialized = new Set<string>()
  for (const id of pixelIds) {
    if (!/^\d{10,20}$/.test(id) || initialized.has(id)) continue
    initialized.add(id)
  }
  if (!initialized.size) return

  if (!window.fbq) {
    const fbq: MetaPixelFunction = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else (fbq.queue = fbq.queue || []).push(args)
    }
    Object.assign(fbq, { queue: [], loaded: true, version: '2.0' })
    window.fbq = fbq
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)._fbq = fbq
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }

  const tracker = window.fbq!
  initialized.forEach((id) => tracker('init', id))
  tracker('track', 'PageView')
}

const SpotifyIcon = (
  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.17 14.524a.625.625 0 01-.86.208c-2.353-1.438-5.315-1.763-8.803-.966a.625.625 0 01-.278-1.219c3.815-.872 7.09-.497 9.733 1.117.295.181.387.565.208.86zm1.115-2.702a.782.782 0 01-1.075.257c-2.693-1.655-6.797-2.135-9.984-1.168a.782.782 0 01-.454-1.496c3.64-1.105 8.163-.57 11.256 1.332a.782.782 0 01.257 1.075zm.096-2.813c-3.232-1.919-8.564-2.095-11.646-1.158a.938.938 0 01-.544-1.797C8.7 6.817 14.527 7.014 18.203 9.18a.938.938 0 01-.922 1.629z"/>
  </svg>
)

const AppleIcon = (
  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5.5 13.5c-.8 0-1.6-.3-2.2-.9-.6.6-1.4.9-2.2.9-1.7 0-3.1-1.4-3.1-3.1 0-1.1.6-2.1 1.5-2.7V8.5C7.5 7.1 8.6 6 10 6h.5C11.1 6 12 6.9 12 8h.5c.8 0 1.5.7 1.5 1.5V10c.9.6 1.5 1.6 1.5 2.7 0 1.7-1.4 3.1-3 3.1-.3 0-.5 0-.5-.3zm-1.5-1.3c.3.2.6.3 1 .3.8 0 1.5-.7 1.5-1.5 0-.5-.3-1-.7-1.3l-.8.5V12c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.5l-.8-.5c-.4.3-.7.8-.7 1.3 0 .8.7 1.5 1.5 1.5z"/>
  </svg>
)

const YouTubeIcon = (
  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
    <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2-.9C17.2 5 12 5 12 5s-5.2 0-7 .1c-.4 0-1.3.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.8C6.8 19 12 19 12 19s5.2 0 7-.2c.4 0 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.3l5.6 2.6-5.6 2.6z"/>
  </svg>
)

const DeezerIcon = (
  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
    <rect x="2" y="15" width="3" height="7" rx="1"/>
    <rect x="7" y="11" width="3" height="11" rx="1"/>
    <rect x="12" y="7" width="3" height="15" rx="1"/>
    <rect x="17" y="3" width="3" height="19" rx="1"/>
  </svg>
)

const PLATFORM_CONFIG: Record<string, { label: string; iconBg: string; icon: React.ReactNode }> = {
  spotify: {
    label: 'Ouvir no Spotify',
    iconBg: '#1DB954',
    icon: SpotifyIcon,
  },
  apple_music: {
    label: 'Ouvir na Apple Music',
    iconBg: 'linear-gradient(135deg, #fc3c44, #f9148b)',
    icon: AppleIcon,
  },
  youtube_music: {
    label: 'Ouvir no YouTube Music',
    iconBg: '#FF0000',
    icon: YouTubeIcon,
  },
  deezer: {
    label: 'Ouvir no Deezer',
    iconBg: 'linear-gradient(135deg, #A238FF, #7B2BCC)',
    icon: DeezerIcon,
  },
}

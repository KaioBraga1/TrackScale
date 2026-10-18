'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface VisitorClick {
  eventType: string
  platform: string | null
  botScore: number
  isFiltered: boolean
  consentGranted: boolean
  createdAt: string
}

interface VisitorData {
  id: string
  ip: string | null
  country: string | null
  region: string | null
  city: string | null
  zipCode: string | null
  latitude: number | null
  longitude: number | null
  device: string | null
  browser: string | null
  os: string | null
  referrer: string | null
  fingerprint: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  fbclid: string | null
  gclid: string | null
  botScore: number
  consentStatus: 'PENDING' | 'GRANTED' | 'DENIED'
  isDatacenter: boolean
  createdAt: string
  link: { title: string; artist: string | null; slug: string }
  clicks: VisitorClick[]
}

interface VisitorPopupProps {
  visitorId: string
  onClose: () => void
}

export default function VisitorPopup({ visitorId, onClose }: VisitorPopupProps) {
  const [visitor, setVisitor] = useState<VisitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchVisitor = useCallback(async () => {
    try {
      const res = await fetch(`/api/visitors/${visitorId}`)
      if (!res.ok) throw new Error('Falha ao carregar dados')
      const data = await res.json()
      setVisitor(data.visitor)
    } catch {
      setError('Erro ao carregar dados do visitante.')
    } finally {
      setLoading(false)
    }
  }, [visitorId])

  useEffect(() => {
    fetchVisitor()
  }, [fetchVisitor])

  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const dataPoints = visitor
    ? [
        visitor.country,
        visitor.city,
        visitor.utmSource,
        visitor.utmCampaign,
        visitor.fbclid,
        visitor.latitude,
        visitor.device,
        visitor.browser,
      ].filter(Boolean).length
    : 0

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-green-500/30 font-mono text-sm"
        style={{ backgroundColor: '#0a0a0a', boxShadow: '0 0 40px rgba(0,255,65,0.1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-green-500/20" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xs font-bold tracking-widest uppercase">TrackScale</span>
            <span className="text-green-500/40">|</span>
            <span className="text-green-500/60 text-xs">visitor.profile</span>
          </div>
          <div className="flex items-center gap-3">
            {!loading && visitor && (
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#0f2a0f', color: '#4ade80', border: '1px solid #166534' }}>
                {dataPoints} DATA POINTS
              </span>
            )}
            <button
              onClick={onClose}
              className="text-green-500/50 hover:text-green-400 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-green-400 animate-pulse text-xs tracking-widest">LOADING...</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-red-400 text-xs">{error}</div>
        )}

        {visitor && (
          <div className="p-5 space-y-6">
            {/* Visitor ID line */}
            <div className="text-xs text-green-500/50">
              <span className="text-green-500/30">$ </span>
              <span>visitor --id </span>
              <span className="text-green-400">{visitor.id}</span>
            </div>

            {/* Event Timeline */}
            <section>
              <SectionHeader label="EVENT TIMELINE" />
              <div className="mt-3 space-y-2 border-l border-green-500/20 pl-4">
                {visitor.clicks.length === 0 ? (
                  <Row label="events" value="none recorded" dim />
                ) : (
                  visitor.clicks.map((click, i) => {
                    const d = new Date(click.createdAt)
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="text-green-500/40 text-xs whitespace-nowrap mt-0.5">
                          {formatDate(d)}<br />{formatTime(d)}
                        </div>
                        <div className="flex-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${click.eventType === 'LINK_VIEW' ? 'text-blue-400 bg-blue-400/10' : 'text-green-400 bg-green-400/10'}`}>
                            {click.eventType}
                          </span>
                          {click.platform && (
                            <span className="ml-2 text-green-500/60 text-xs">{click.platform}</span>
                          )}
                          <span className={`ml-2 text-[10px] ${click.isFiltered ? 'text-red-400' : 'text-green-500/50'}`}>
                            {click.isFiltered ? 'filtered' : 'valid'}
                          </span>
                          {click.consentGranted && (
                            <span className="ml-2 text-[10px] text-purple-300">consented</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* Link info */}
            <section>
              <SectionHeader label="LINK" />
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                <Row label="title" value={visitor.link.title} />
                <Row label="artist" value={visitor.link.artist} />
                <Row label="slug" value={`/${visitor.link.slug}`} />
                <Row label="first_seen" value={formatDateTime(new Date(visitor.createdAt))} />
              </div>
            </section>

            {/* Geo / Location */}
            <section>
              <SectionHeader label="VISITOR DETAILS" />
              <div className="mt-3 space-y-4">
                {/* World map placeholder with dot */}
                <WorldMap lat={visitor.latitude} lng={visitor.longitude} />

                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <Row label="country" value={visitor.country} />
                  <Row label="region" value={visitor.region} />
                  <Row label="city" value={visitor.city} />
                  <Row label="zip_code" value={visitor.zipCode} />
                  {visitor.latitude !== null && visitor.longitude !== null && (
                    <Row label="coordinates" value={`${visitor.latitude?.toFixed(4)}, ${visitor.longitude?.toFixed(4)}`} />
                  )}
                  <Row label="ip" value={visitor.ip} />
                  <Row label="datacenter" value={visitor.isDatacenter ? 'yes' : 'no'} />
                </div>
              </div>
            </section>

            {/* Device */}
            <section>
              <SectionHeader label="DEVICE" />
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                <Row label="device" value={visitor.device} />
                <Row label="browser" value={visitor.browser} />
                <Row label="os" value={visitor.os} />
                <Row label="fingerprint" value={visitor.fingerprint ? `${visitor.fingerprint.slice(0, 16)}…` : null} />
                <Row label="bot_score" value={`${(visitor.botScore * 100).toFixed(0)}%`} highlight={visitor.botScore > 0.5 ? 'danger' : visitor.botScore > 0.2 ? 'warn' : 'ok'} />
                <Row label="consent" value={visitor.consentStatus} />
              </div>
            </section>

            {/* UTM / Campaign */}
            <section>
              <SectionHeader label="CAMPAIGN PARAMS" />
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                <Row label="utm_source" value={visitor.utmSource} />
                <Row label="utm_medium" value={visitor.utmMedium} />
                <Row label="utm_campaign" value={visitor.utmCampaign} />
                <Row label="utm_content" value={visitor.utmContent} />
                <Row label="utm_term" value={visitor.utmTerm} />
                <Row label="fbclid" value={visitor.fbclid ? `${visitor.fbclid.slice(0, 20)}…` : null} />
                <Row label="gclid" value={visitor.gclid ? `${visitor.gclid.slice(0, 20)}…` : null} />
                <Row label="referrer" value={visitor.referrer ? truncate(visitor.referrer, 40) : null} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-green-500/30 text-xs">▸</span>
      <span className="text-green-500 text-xs font-bold tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-green-500/15" />
    </div>
  )
}

function Row({
  label,
  value,
  dim,
  highlight,
}: {
  label: string
  value: string | number | null | undefined
  dim?: boolean
  highlight?: 'ok' | 'warn' | 'danger'
}) {
  const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '—'
  const isEmpty = displayValue === '—'

  const valueColor = isEmpty || dim
    ? 'text-green-500/30'
    : highlight === 'danger'
    ? 'text-red-400'
    : highlight === 'warn'
    ? 'text-yellow-400'
    : highlight === 'ok'
    ? 'text-green-400'
    : 'text-green-300'

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-green-500/40 shrink-0 w-28">{label}</span>
      <span className={`${valueColor} break-all`}>{displayValue}</span>
    </div>
  )
}

function WorldMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  // Simple ASCII-art world map with a dot overlay using SVG
  const hasCoords = lat !== null && lng !== null

  // Map lat/lng → percentage position on our viewport
  // lat: 90 (top) to -90 (bottom) → 0% to 100%
  // lng: -180 (left) to 180 (right) → 0% to 100%
  const dotX = hasCoords ? ((lng! + 180) / 360) * 100 : null
  const dotY = hasCoords ? ((90 - lat!) / 180) * 100 : null

  return (
    <div
      className="relative w-full rounded border border-green-500/20 overflow-hidden"
      style={{ height: '120px', backgroundColor: '#050f05' }}
    >
      {/* Simplified SVG world outline */}
      <svg
        viewBox="0 0 360 180"
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.25 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Very rough continent blobs in green */}
        {/* North America */}
        <ellipse cx="75" cy="60" rx="38" ry="28" fill="#22c55e" />
        {/* South America */}
        <ellipse cx="95" cy="120" rx="22" ry="32" fill="#22c55e" />
        {/* Europe */}
        <ellipse cx="178" cy="50" rx="16" ry="14" fill="#22c55e" />
        {/* Africa */}
        <ellipse cx="182" cy="105" rx="22" ry="30" fill="#22c55e" />
        {/* Asia */}
        <ellipse cx="255" cy="60" rx="52" ry="30" fill="#22c55e" />
        {/* Australia */}
        <ellipse cx="292" cy="128" rx="20" ry="15" fill="#22c55e" />
      </svg>

      {/* Grid lines */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,197,94,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.06) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }} />

      {/* Dot */}
      {hasCoords && dotX !== null && dotY !== null && (
        <div
          className="absolute"
          style={{ left: `${dotX}%`, top: `${dotY}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px 3px rgba(74,222,128,0.6)' }} />
        </div>
      )}

      {!hasCoords && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-green-500/30 text-xs tracking-widest">NO COORDINATES</span>
        </div>
      )}
    </div>
  )
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(d: Date) {
  return `${formatDate(d)} ${formatTime(d)}`
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

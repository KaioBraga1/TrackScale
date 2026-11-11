'use client'

import { useState } from 'react'
import VisitorPopup from './VisitorPopup'

interface Visitor {
  id: string
  country: string | null
  city: string | null
  device: string | null
  browser: string | null
  consentStatus: 'PENDING' | 'GRANTED' | 'DENIED'
  createdAt: string
  botScore: number
}

interface VisitorsTableProps {
  visitors: Visitor[]
}

export default function VisitorsTable({ visitors }: VisitorsTableProps) {
  const [activeVisitorId, setActiveVisitorId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const visibleVisitors = showAll ? visitors : visitors.slice(0, 3)

  return (
    <>
      {activeVisitorId && (
        <VisitorPopup
          visitorId={activeVisitorId}
          onClose={() => setActiveVisitorId(null)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Country</th>
              <th className="text-left py-2 font-medium">City</th>
              <th className="text-left py-2 font-medium">Device</th>
              <th className="text-left py-2 font-medium">Browser</th>
              <th className="text-left py-2 font-medium">Consent</th>
              <th className="text-right py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody id="visitor-rows">
            {visibleVisitors.map((v) => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="py-2 text-muted">
                  {new Date(v.createdAt).toLocaleString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-2">{v.country ?? '—'}</td>
                <td className="py-2 text-muted">{v.city ?? '—'}</td>
                <td className="py-2 text-muted capitalize">{v.device ?? '—'}</td>
                <td className="py-2 text-muted">{v.browser ?? '—'}</td>
                <td className="py-2 text-xs text-muted">{v.consentStatus}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setActiveVisitorId(v.id)}
                    className="text-xs px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors font-mono"
                  >
                    view →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visitors.length > 3 && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="btn-ghost px-3 py-1.5 text-sm"
            aria-controls="visitor-rows"
            aria-expanded={showAll}
          >
            {showAll ? 'Show less' : `View all (${visitors.length})`}
          </button>
        </div>
      )}
    </>
  )
}

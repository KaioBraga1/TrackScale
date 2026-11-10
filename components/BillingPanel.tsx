'use client'

import { useState } from 'react'

type PlanId = 'STARTER' | 'GROWTH' | 'SCALE'

interface Plan {
  id: PlanId
  name: string
  price: string
  features: string[]
  fill?: boolean
}

const PLANS: Plan[] = [
  { id: 'STARTER', name: 'Starter', price: '$19', features: ['5 smart links', 'Organic analytics', 'Bot filtering', '1 artist'] },
  { id: 'GROWTH', name: 'Growth', price: '$59', features: ['Unlimited links', 'Meta Pixel + CAPI', 'CPC, CPL, ROI dashboard', 'Paid + organic funnel', 'Spotify followers', '5 artists'], fill: true },
  { id: 'SCALE', name: 'Scale', price: '$149', features: ['Everything in Growth', 'Fan Data CRM', 'Creatives analytics', 'Autopilot', 'Unlimited artists'] },
]

export default function BillingPanel({
  currentPlan,
  hasSubscription,
  priceLabel,
  interval,
  periodEnd,
  status,
}: {
  currentPlan: string
  hasSubscription: boolean
  priceLabel: string | null
  interval: string | null
  periodEnd: string | null
  status: string | null
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const subscribe = async (plan: PlanId) => {
    setLoading(plan); setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(null)
    }
  }

  const manage = async () => {
    setLoading('portal'); setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not open billing portal')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(null)
    }
  }

  const isPro = currentPlan !== 'FREE'

  return (
    <div className="space-y-5">
      {/* Current plan summary */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">
            Current plan: <span style={{ color: isPro ? '#c084fc' : 'var(--text)' }}>{currentPlan}</span>
          </h2>
          <p className="text-sm text-muted mt-0.5">
            {hasSubscription && priceLabel
              ? <>{priceLabel}{interval ? ` / ${interval}` : ''}{status ? ` · ${status}` : ''}{periodEnd ? ` · renews ${periodEnd}` : ''}</>
              : 'No active subscription.'}
          </p>
        </div>
        {hasSubscription && (
          <button onClick={manage} disabled={loading === 'portal'} className="btn-secondary text-sm">
            {loading === 'portal' ? 'Opening…' : 'Manage subscription'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id
          return (
            <div
              key={p.id}
              className="rounded-2xl p-5 flex flex-col"
              style={{
                background: p.fill ? 'linear-gradient(165deg, rgba(168,85,247,0.1), rgba(255,255,255,0.02))' : 'var(--glass-bg)',
                border: `1px solid ${p.fill ? 'rgba(168,85,247,0.3)' : 'var(--glass-border)'}`,
              }}
            >
              <p className="font-outfit font-bold text-lg" style={{ color: 'var(--text)' }}>{p.name}</p>
              <p className="font-outfit font-extrabold mt-1" style={{ fontSize: 30, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                {p.price}<span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>/mo</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-xs flex items-start gap-2" style={{ color: 'var(--muted)' }}>
                    <span style={{ color: '#a855f7', marginTop: 1 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(p.id)}
                disabled={isCurrent || loading !== null}
                className={isCurrent ? 'btn-secondary opacity-60 mt-5 w-full justify-center' : 'btn-primary mt-5 w-full justify-center'}
              >
                {isCurrent ? 'Current plan' : loading === p.id ? 'Redirecting…' : `Choose ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-muted">
        Secure checkout by Stripe. Cancel anytime from “Manage subscription”.
      </p>
    </div>
  )
}

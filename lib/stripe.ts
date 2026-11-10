import Stripe from 'stripe'

export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

// Lazy singleton — the Stripe SDK throws at construction without a key, so we
// only build it on first use (routes guard with stripeEnabled first).
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(key, { apiVersion: '2026-10-28.endive', typescript: true })
  }
  return _stripe
}

/** Days of free trial on paid plans (0 = charge immediately). */
export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? '7')

export type PlanId = 'STARTER' | 'GROWTH' | 'SCALE'

export interface PlanDef {
  id: PlanId
  name: string
  priceId: string | undefined
  price: string
  interval: string
  features: string[]
}

/** Plan catalog. Price IDs come from env so they can differ per environment. */
export const PLANS: Record<PlanId, PlanDef> = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_STARTER,
    price: '$19',
    interval: 'month',
    features: ['5 smart links', 'Real-time organic analytics', 'Bot filtering', '1 artist'],
  },
  GROWTH: {
    id: 'GROWTH',
    name: 'Growth',
    priceId: process.env.STRIPE_PRICE_GROWTH,
    price: '$59',
    interval: 'month',
    features: ['Unlimited links', 'Meta Pixel + Conversions API', 'CPC, CPL, ROI dashboard', 'Paid + organic funnel', 'Spotify followers', '5 artists'],
  },
  SCALE: {
    id: 'SCALE',
    name: 'Scale',
    priceId: process.env.STRIPE_PRICE_SCALE,
    price: '$149',
    interval: 'month',
    features: ['Everything in Growth', 'Fan Data CRM', 'Creatives analytics', 'Autopilot optimization', 'Unlimited artists'],
  },
}

/** Map a Stripe price ID back to our plan id (used by the webhook). */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return plan.id
  }
  return null
}

export function isValidPlan(id: string): id is PlanId {
  return id === 'STARTER' || id === 'GROWTH' || id === 'SCALE'
}

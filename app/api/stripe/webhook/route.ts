import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe, stripeEnabled, planFromPriceId } from '@/lib/stripe'

// Stripe needs the raw body to verify the signature.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!stripeEnabled) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not set' }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        if (s.mode !== 'subscription' || !s.subscription) break
        const sub = await getStripe().subscriptions.retrieve(s.subscription as string)
        await applySubscription(sub, (s.customer as string) ?? undefined, s.metadata?.userId)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await applySubscription(sub, sub.customer as string)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            membershipStatus: 'FREE',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            subscriptionInterval: null,
            subscriptionPrice: null,
          },
        })
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function applySubscription(sub: Stripe.Subscription, customerId?: string, fallbackUserId?: string) {
  const item = sub.items.data[0]
  const priceId = item?.price?.id
  const plan = planFromPriceId(priceId)
  const active = sub.status === 'active' || sub.status === 'trialing'
  const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end

  const data = {
    membershipStatus: active && plan ? plan : 'FREE',
    subscriptionStatus: sub.status,
    stripeSubscriptionId: sub.id,
    subscriptionInterval: item?.price?.recurring?.interval ?? null,
    subscriptionPrice: item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  }

  // Prefer matching by Stripe customer id; fall back to the userId from metadata.
  if (customerId) {
    const updated = await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data })
    if (updated.count > 0) return
  }
  if (fallbackUserId) {
    await prisma.user.update({ where: { id: fallbackUserId }, data: { ...data, stripeCustomerId: customerId ?? undefined } })
  }
}

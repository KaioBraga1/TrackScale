import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, stripeEnabled, PLANS, isValidPlan, TRIAL_DAYS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!stripeEnabled) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { plan } = (await request.json().catch(() => ({}))) as { plan?: string }
  if (!plan || !isValidPlan(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planDef = PLANS[plan]
  if (!planDef.priceId) {
    return NextResponse.json({ error: `Price for ${plan} is not configured.` }, { status: 503 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, stripeCustomerId: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    // Ensure a Stripe customer exists for this user
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: planDef.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      success_url: `${appUrl}/settings?tab=membership&checkout=success`,
      cancel_url: `${appUrl}/settings?tab=membership&checkout=cancelled`,
    })
    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe checkout failed'
    console.error('Stripe checkout error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

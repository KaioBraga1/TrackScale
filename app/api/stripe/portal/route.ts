import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, stripeEnabled } from '@/lib/stripe'

export async function POST() {
  if (!stripeEnabled) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  })
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found.' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const portal = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings?tab=membership`,
  })

  return NextResponse.json({ url: portal.url })
}

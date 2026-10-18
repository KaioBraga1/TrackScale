import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const consentSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  visitorId: z.string().cuid(),
  viewClickId: z.string().cuid().optional(),
  consentStatus: z.enum(['PENDING', 'GRANTED', 'DENIED']),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`consent:${ip}`, 30, 60_000).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = consentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { slug, visitorId, viewClickId, consentStatus } = parsed.data

  try {
    const link = await prisma.link.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const visitor = await prisma.visitor.findFirst({
      where: { id: visitorId, linkId: link.id },
      select: { id: true },
    })
    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.visitor.update({
        where: { id: visitor.id },
        data: {
          consentStatus,
          ...(consentStatus === 'GRANTED' ? {} : { ip: null, fingerprint: null }),
        },
      })

      if (viewClickId) {
        await tx.click.updateMany({
          where: {
            id: viewClickId,
            linkId: link.id,
            visitorId: visitor.id,
            eventType: 'LINK_VIEW',
            isFiltered: false,
          },
          data: { consentGranted: consentStatus === 'GRANTED' },
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[consent] update failed:', err)
    return NextResponse.json({ error: 'Consent could not be saved' }, { status: 500 })
  }
}

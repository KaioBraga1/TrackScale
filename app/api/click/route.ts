import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { serverHumanScore, combinedHumanScore, isEventFiltered } from '@/lib/bot-detection'
import { getGeoFromIP } from '@/lib/geo'
import { rateLimit } from '@/lib/rate-limit'
import { sendCapiEventSilent } from '@/lib/meta-capi'

const clickSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  eventType: z.enum(['LINK_VIEW', 'PLATFORM_CLICK']),
  platform: z.string().max(30).optional().nullable(),
  fingerprint: z.string().max(64).optional().nullable(),
  humanScoreClient: z.number().min(0).max(1).optional().default(0),
  consentStatus: z.enum(['PENDING', 'GRANTED', 'DENIED']).optional().default('PENDING'),
  visitorId: z.string().cuid().optional().nullable(),
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  fbclid: z.string().max(500).optional().nullable(),
  gclid: z.string().max(500).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipLimit = rateLimit(`click:${ip}`, 60, 60_000)
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, isFiltered: true, error: 'Too many requests' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = clickSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const {
    slug,
    eventType,
    platform,
    fingerprint,
    humanScoreClient,
    consentStatus,
    visitorId: requestedVisitorId,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    fbclid,
    gclid,
  } = parsed.data

  if (fingerprint) {
    const fingerprintLimit = rateLimit(
      `click-fingerprint:${fingerprint}`,
      10,
      10_000
    )
    if (!fingerprintLimit.allowed) {
      return NextResponse.json(
        { ok: false, isFiltered: true, error: 'Too many requests' },
        { status: 429 }
      )
    }
  }

  try {
    // Retorna 200 mesmo se link não existir — não vaza info.
    const link = await prisma.link.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        metaPixelId: true,
        platforms: {
          where: { isActive: true },
          select: { name: true },
        },
      },
    })

    if (!link) {
      return NextResponse.json({ ok: true, isFiltered: true })
    }

    const requestedVisitor = requestedVisitorId
      ? await prisma.visitor.findFirst({
          where: { id: requestedVisitorId, linkId: link.id },
          select: { id: true, consentStatus: true, isDatacenter: true },
        })
      : null

    const geo = await getGeoFromIP(ip)
    const isDatacenter = geo?.isDatacenter ?? requestedVisitor?.isDatacenter ?? false
    const ua = req.headers.get('user-agent') ?? ''
    const humanScore = combinedHumanScore(
      serverHumanScore(ua, isDatacenter),
      humanScoreClient
    )
    const filtered = isEventFiltered(humanScore)
    const botScore = 1 - humanScore

    if (eventType === 'LINK_VIEW') {
      let visitor =
        requestedVisitor ??
        (fingerprint
          ? await prisma.visitor.findFirst({
              where: { linkId: link.id, fingerprint },
              select: { id: true, consentStatus: true, isDatacenter: true },
            })
          : null)

      if (visitor) {
        visitor = await prisma.visitor.update({
          where: { id: visitor.id },
          data: {
            consentStatus,
            botScore,
            isDatacenter,
            ...(geo
              ? {
                  country: geo.country,
                  region: geo.region,
                  city: geo.city,
                  zipCode: geo.zipCode,
                  latitude: geo.latitude,
                  longitude: geo.longitude,
                }
              : {}),
            ...(consentStatus === 'GRANTED'
              ? { ip, fingerprint: fingerprint ?? undefined }
              : { ip: null, fingerprint: null }),
          },
          select: { id: true, consentStatus: true, isDatacenter: true },
        })
      } else {
        visitor = await prisma.visitor.create({
          data: {
            linkId: link.id,
            ip: consentStatus === 'GRANTED' ? ip : null,
            fingerprint: consentStatus === 'GRANTED' ? fingerprint ?? null : null,
            browser: parseBrowser(ua),
            os: parseOS(ua),
            device: parseDevice(ua),
            referrer: req.headers.get('referer') ?? null,
            botScore,
            consentStatus,
            country: geo?.country ?? null,
            region: geo?.region ?? null,
            city: geo?.city ?? null,
            zipCode: geo?.zipCode ?? null,
            latitude: geo?.latitude ?? null,
            longitude: geo?.longitude ?? null,
            isDatacenter,
            utmSource: utmSource ?? null,
            utmMedium: utmMedium ?? null,
            utmCampaign: utmCampaign ?? null,
            utmContent: utmContent ?? null,
            utmTerm: utmTerm ?? null,
            fbclid: fbclid ?? null,
            gclid: gclid ?? null,
          },
          select: { id: true, consentStatus: true, isDatacenter: true },
        })
      }

      if (!visitor) throw new Error('Visitor could not be resolved')

      const viewClick = await prisma.click.create({
        data: {
          linkId: link.id,
          visitorId: visitor.id,
          eventType: 'LINK_VIEW',
          botScore,
          isFiltered: filtered,
          consentGranted: visitor.consentStatus === 'GRANTED',
        },
        select: { id: true },
      })

      // CAPI: só dispara se tráfego real E consentimento GRANTED
      // Fire-and-forget — nunca bloqueia a resposta
      const capiToken = process.env.META_CAPI_ACCESS_TOKEN
      const capiPixelId = link.metaPixelId ?? process.env.META_CAPI_DEFAULT_PIXEL_ID
      if (!filtered && visitor.consentStatus === 'GRANTED' && capiToken && capiPixelId) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        sendCapiEventSilent({
          pixelId: capiPixelId,
          accessToken: capiToken,
          eventName: 'ViewContent',
          eventId: viewClick.id,
          eventSourceUrl: `${appUrl}/l/${slug}`,
          clientIp: ip,
          clientUserAgent: ua,
          fbclid: fbclid ?? null,
          country: geo?.country ?? null,
          state: geo?.region ?? null,
          city: geo?.city ?? null,
          zip: geo?.zipCode ?? null,
          externalId: visitor.id,
        })
      }

      return NextResponse.json({
        ok: true,
        visitorId: visitor.id,
        viewClickId: viewClick.id,
        isFiltered: filtered,
      })
    }

    const isActivePlatform = link.platforms.some((item) => item.name === platform)
    if (!isActivePlatform) {
      return NextResponse.json({ ok: true, isFiltered: true })
    }

    const platformClick = await prisma.click.create({
      data: {
        linkId: link.id,
        visitorId: requestedVisitor?.id ?? null,
        eventType: 'PLATFORM_CLICK',
        platform: platform ?? null,
        botScore,
        isFiltered: filtered,
        consentGranted: requestedVisitor?.consentStatus === 'GRANTED',
      },
      select: { id: true },
    })

    // CAPI Lead event no clique de plataforma — representa intenção de escuta
    const capiToken = process.env.META_CAPI_ACCESS_TOKEN
    const capiPixelId = link.metaPixelId ?? process.env.META_CAPI_DEFAULT_PIXEL_ID
    if (!filtered && requestedVisitor?.consentStatus === 'GRANTED' && capiToken && capiPixelId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      sendCapiEventSilent({
        pixelId: capiPixelId,
        accessToken: capiToken,
        eventName: 'Lead',
        eventId: platformClick.id,
        eventSourceUrl: `${appUrl}/l/${slug}`,
        clientIp: ip,
        clientUserAgent: ua,
        fbclid: fbclid ?? null,
        country: geo?.country ?? null,
        state: geo?.region ?? null,
        city: geo?.city ?? null,
        zip: geo?.zipCode ?? null,
        externalId: requestedVisitor?.id ?? '',
      })
    }

    return NextResponse.json({ ok: true, isFiltered: filtered })
  } catch (err) {
    console.error('[click] tracking failed:', err)
    return NextResponse.json(
      { error: 'Tracking unavailable', isFiltered: true },
      { status: 500 }
    )
  }
}

function parseBrowser(ua: string): string | null {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/Chrome/i.test(ua)) return 'Chrome'
  if (/Firefox/i.test(ua)) return 'Firefox'
  if (/Safari/i.test(ua)) return 'Safari'
  if (/Opera|OPR/i.test(ua)) return 'Opera'
  return null
}

function parseOS(ua: string): string | null {
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad/i.test(ua)) return 'iOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return null
}

function parseDevice(ua: string): string | null {
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile'
  if (/iPad|Tablet/i.test(ua)) return 'tablet'
  return 'desktop'
}

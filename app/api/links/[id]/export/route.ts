import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PERIOD_DAYS: Record<string, number> = { today: 1, '7d': 7, '28d': 28 }

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const link = await prisma.link.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, slug: true },
  })
  if (!link || link.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const query = req.nextUrl.searchParams
  const mode = query.get('mode') === 'consent' ? 'consent' : 'total'
  const days = PERIOD_DAYS[query.get('period') ?? ''] ?? 28
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - days + 1)

  const rows = await prisma.click.findMany({
    where: {
      linkId: link.id,
      createdAt: { gte: start },
      isFiltered: false,
      botScore: { lt: 0.5 },
      ...(mode === 'consent' ? { consentGranted: true } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 50_000,
    select: {
      createdAt: true,
      eventType: true,
      platform: true,
      consentGranted: true,
      botScore: true,
      visitor: {
        select: {
          country: true,
          city: true,
          referrer: true,
          utmSource: true,
        },
      },
    },
  })

  const csvRows = [
    ['timestamp_utc', 'event_type', 'platform', 'country', 'city', 'source', 'consent', 'bot_score'],
    ...rows.map((row) => [
      row.createdAt.toISOString(),
      row.eventType,
      row.platform ?? '',
      row.visitor?.country ?? '',
      row.visitor?.city ?? '',
      row.visitor?.utmSource ?? row.visitor?.referrer ?? '',
      row.consentGranted ? 'granted' : 'not_granted',
      row.botScore.toFixed(3),
    ]),
  ]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n')

  return new NextResponse(`\uFEFF${csvRows}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${link.slug}-analytics-${mode}-${days}d.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

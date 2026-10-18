import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const visitor = await prisma.visitor.findUnique({
    where: { id: params.id },
    include: {
      link: { select: { userId: true, title: true, artist: true, slug: true } },
      clicks: {
        select: {
          eventType: true,
          platform: true,
          botScore: true,
          isFiltered: true,
          consentGranted: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // IDOR: garante que o visitor pertence a um link do usuário
  if (!visitor || visitor.link.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ visitor })
}

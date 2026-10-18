import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLink } from '../actions'
import ResolveLinkFlow from '@/components/ResolveLinkFlow'
import Link from 'next/link'

export const metadata = { title: 'Novo Smart Link' }

export default async function NewLinkPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [spotifyConnection, pixels, artists] = await Promise.all([
    prisma.spotifyConnection.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.pixel.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, metaPixelId: true },
      orderBy: { name: 'asc' },
    }),
    prisma.artist.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-muted hover:text-white text-sm">
          ← Dashboard
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-semibold">Novo Smart Link</h1>
      </div>

      <ResolveLinkFlow
        action={createLink}
        hasSpotify={!!spotifyConnection}
        pixels={pixels}
        artists={artists}
      />
    </div>
  )
}

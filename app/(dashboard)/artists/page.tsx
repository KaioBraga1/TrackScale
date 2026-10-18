import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ArtistList from './ArtistList'

export const metadata = { title: 'Artists | TrackScale' }

export default async function ArtistsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const artists = await prisma.artist.findMany({
    where: { userId: session.user.id },
    include: {
      links: {
        select: { id: true, title: true, slug: true },
        orderBy: { createdAt: 'desc' },
      },
      pixels: {
        select: { pixel: { select: { id: true, name: true, metaPixelId: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text)' }}>Artists</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Gerencie seus artistas, vincule pixels e smartlinks.
        </p>
      </header>

      <ArtistList artists={artists} />
    </div>
  )
}

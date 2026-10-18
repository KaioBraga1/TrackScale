import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateLink } from '../../actions'
import LinkForm from '@/components/LinkForm'
import Link from 'next/link'

export const metadata = { title: 'Editar Link' }

export default async function EditLinkPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const link = await prisma.link.findUnique({
    where: { id: params.id },
    include: {
      platforms: true,
      pixels: { select: { pixelId: true } },
      artists: { select: { artistId: true } },
    },
  })

  if (!link || link.userId !== session.user.id) notFound()

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

  const boundAction = updateLink.bind(null, link.id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-muted hover:text-white text-sm">
          ← Dashboard
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-semibold">Editar: {link.title}</h1>
      </div>

      <LinkForm
        action={boundAction}
        submitLabel="Salvar alterações"
        hasSpotify={!!spotifyConnection}
        pixels={pixels}
        selectedPixelIds={link.pixels.map((item) => item.pixelId)}
        artists={artists}
        selectedArtistIds={link.artists.map((item) => item.artistId)}
        defaultValues={{
          title: link.title,
          artist: link.artist ?? '',
          slug: link.slug,
          coverUrl: link.coverUrl ?? '',
          theme: link.theme ?? 'dark-navy',
          metaPixelId: link.metaPixelId ?? '',
          platforms: link.platforms,
        }}
      />
    </div>
  )
}

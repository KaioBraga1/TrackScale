import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import Script from 'next/script'
import SmartLink from '@/components/SmartLink'

interface PageProps {
  params: { slug: string }
  searchParams: { spotify?: string }
}

const THEMES: Record<string, { bg: string; card: string; border: string }> = {
  'dark-navy':   { bg: '#0b0b18', card: '#14142a', border: '#20203a' },
  'dark-purple': { bg: '#0d0616', card: '#180e2a', border: '#261840' },
  'midnight':    { bg: '#070709', card: '#111116', border: '#1c1c24' },
  'forest':      { bg: '#050e06', card: '#0c1a0d', border: '#14281a' },
  'ocean':       { bg: '#030c17', card: '#081524', border: '#0f2236' },
  'crimson':     { bg: '#0e0408', card: '#1a080d', border: '#2a1018' },
}

async function getLink(slug: string) {
  return prisma.link.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      artist: true,
      coverUrl: true,
      theme: true,
      metaPixelId: true,
      pixels: {
        select: { pixel: { select: { metaPixelId: true } } },
      },
      artists: {
        select: {
          artist: {
            select: {
              pixels: { select: { pixel: { select: { metaPixelId: true } } } },
            },
          },
        },
      },
      platforms: {
        where: { isActive: true },
        select: { name: true, url: true },
        orderBy: { order: 'asc' },
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const link = await getLink(params.slug)
  if (!link) return { title: 'Link não encontrado' }

  const title = link.artist ? `${link.title} — ${link.artist}` : link.title
  const desc  = link.artist
    ? `Ouça "${link.title}" de ${link.artist} na sua plataforma favorita`
    : `Ouça "${link.title}" na sua plataforma favorita`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: link.coverUrl ? [{ url: link.coverUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: link.coverUrl ? [link.coverUrl] : [],
    },
  }
}

export default async function SmartLinkPage({ params, searchParams }: PageProps) {
  const link = await getLink(params.slug)
  if (!link) notFound()

  const theme = THEMES[link.theme ?? 'dark-navy'] ?? THEMES['dark-navy']

  const pixelIds = [
    ...link.pixels.map((a) => a.pixel.metaPixelId),
    ...link.artists.flatMap((a) => a.artist.pixels.map((ap) => ap.pixel.metaPixelId)),
    ...(link.metaPixelId ? [link.metaPixelId] : []),
  ].filter((id, idx, ids) => ids.indexOf(id) === idx)

  return (
    <>
      <Script src="/track.js" strategy="beforeInteractive" />

      <div
        className="min-h-screen flex flex-col items-center"
        style={{ backgroundColor: theme.bg }}
      >
        {/* Ambient glow top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)',
          }}
          aria-hidden
        />

        {/* Logo */}
        <div className="w-full max-w-sm pt-10 pb-4 flex items-center justify-center gap-2 relative z-10">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-bold text-sm tracking-tight">TrackScale</span>
        </div>

        {/* Content */}
        <div className="w-full max-w-sm flex flex-col items-center space-y-5 pb-16 relative z-10">
          {/* Album cover */}
          <div
            className="w-52 h-52 rounded-3xl overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: theme.card,
              boxShadow: link.coverUrl
                ? '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            {link.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.coverUrl}
                alt={link.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" style={{ color: theme.border }}>
                  <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Title + artist */}
          <div className="text-center space-y-1 px-4">
            <h1 className="text-2xl font-bold text-white leading-tight">{link.title}</h1>
            {link.artist && (
              <p className="text-sm" style={{ color: '#8888aa' }}>{link.artist}</p>
            )}
          </div>

          {/* Spotify connected alert */}
          {searchParams.spotify === 'connected' && (
            <div
              className="w-full px-4 py-2.5 rounded-xl text-center text-xs font-medium"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
            >
              ✓ Conta Spotify conectada com sucesso!
            </div>
          )}

          {/* Platform buttons */}
          <div className="w-full px-1">
            <SmartLink
              linkId={link.id}
              slug={link.slug}
              platforms={link.platforms}
              metaPixelIds={pixelIds}
              theme={theme}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-8 text-center relative z-10">
          <p className="text-xs" style={{ color: '#33334a' }}>Powered by TrackScale</p>
        </div>
      </div>
    </>
  )
}

import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getValidSpotifyToken } from '@/lib/spotify'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = req.headers.get('authorization') ?? ''
  const expected = secret ? `Bearer ${secret}` : ''
  const providedBuffer = Buffer.from(authorization)
  const expectedBuffer = Buffer.from(expected)
  if (
    !secret ||
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const links = await prisma.link.findMany({
    where: { spotifyPlaylistId: { not: null } },
    select: { id: true, userId: true, spotifyPlaylistId: true },
  })
  const tokens = new Map<string, string | null>()
  const results: Array<{ linkId: string; status: string }> = []
  const snapshotDate = new Date()
  snapshotDate.setUTCHours(0, 0, 0, 0)

  for (const link of links) {
    try {
      let token = tokens.get(link.userId)
      if (token === undefined) {
        token = await getValidSpotifyToken(link.userId)
        tokens.set(link.userId, token)
      }
      if (!token) {
        results.push({ linkId: link.id, status: 'spotify-not-connected' })
        continue
      }

      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(link.spotifyPlaylistId!)}?fields=id,followers(total)`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
      )
      if (!response.ok) {
        console.error('[playlist-followers cron] Spotify API returned', response.status, 'for link', link.id)
        results.push({ linkId: link.id, status: `spotify-error-${response.status}` })
        continue
      }
      const data = await response.json()
      if (!Number.isInteger(data.followers?.total)) {
        results.push({ linkId: link.id, status: 'follower-total-unavailable' })
        continue
      }

      await prisma.playlistFollowerSnapshot.upsert({
        where: { linkId_snapshotDate: { linkId: link.id, snapshotDate } },
        create: { linkId: link.id, snapshotDate, followers: data.followers.total },
        update: { followers: data.followers.total },
      })
      results.push({ linkId: link.id, status: 'saved' })
    } catch (error) {
      console.error('[playlist-followers cron] sync failed for link', link.id, error)
      results.push({ linkId: link.id, status: 'failed' })
    }
  }

  return NextResponse.json({
    date: snapshotDate.toISOString().slice(0, 10),
    processed: links.length,
    results,
  })
}

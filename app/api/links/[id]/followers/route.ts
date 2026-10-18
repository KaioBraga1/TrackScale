import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getValidSpotifyToken } from '@/lib/spotify'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const link = await prisma.link.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, spotifyPlaylistId: true },
  })
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!link.spotifyPlaylistId) {
    return NextResponse.json(
      { error: 'Import a Spotify playlist to enable follower snapshots.' },
      { status: 409 }
    )
  }

  try {
    const token = await getValidSpotifyToken(session.user.id)
    if (!token) {
      return NextResponse.json(
        { error: 'Connect or reconnect Spotify to sync followers.' },
        { status: 409 }
      )
    }

    const spotifyResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(link.spotifyPlaylistId)}?fields=id,followers(total)`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
    )
    if (!spotifyResponse.ok) {
      console.error('[playlist-followers] Spotify API returned', spotifyResponse.status)
      return NextResponse.json(
        { error: 'Spotify could not provide follower data. Reconnect with playlist access and try again.' },
        { status: 502 }
      )
    }
    const data = await spotifyResponse.json()
    if (!Number.isInteger(data.followers?.total)) {
      return NextResponse.json({ error: 'Spotify did not return follower totals.' }, { status: 502 })
    }

    const snapshotDate = new Date()
    snapshotDate.setUTCHours(0, 0, 0, 0)
    const snapshot = await prisma.playlistFollowerSnapshot.upsert({
      where: { linkId_snapshotDate: { linkId: link.id, snapshotDate } },
      create: { linkId: link.id, snapshotDate, followers: data.followers.total },
      update: { followers: data.followers.total },
      select: { followers: true, snapshotDate: true },
    })

    return NextResponse.json({
      ok: true,
      followers: snapshot.followers,
      snapshotDate: snapshot.snapshotDate.toISOString(),
    })
  } catch (error) {
    console.error('[playlist-followers] sync failed:', error)
    return NextResponse.json({ error: 'Could not sync playlist followers.' }, { status: 500 })
  }
}

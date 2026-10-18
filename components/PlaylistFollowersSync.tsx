'use client'

import { useState } from 'react'

export default function PlaylistFollowersSync({ linkId }: { linkId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function sync() {
    setBusy(true)
    setMessage(null)
    setError(false)
    try {
      const response = await fetch(`/api/links/${linkId}/followers`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Sync failed')
      setMessage(`Snapshot saved: ${data.followers.toLocaleString()} followers.`)
      window.location.reload()
    } catch (cause) {
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'Sync failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void sync()} disabled={busy} className="btn-secondary text-xs">
        {busy ? 'Syncing…' : 'Sync today’s snapshot'}
      </button>
      {message && <p role="status" className={`text-xs ${error ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>}
    </div>
  )
}

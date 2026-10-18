'use client'

import { useState } from 'react'

export default function ShareButton({ url }: { url: string }) {
  const [message, setMessage] = useState<string | null>(null)

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ url })
        return
      }
      await navigator.clipboard.writeText(url)
      setMessage('Link copied')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('[share] unable to share link:', error)
      setMessage('Sharing unavailable')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void share()} className="btn-secondary text-xs" aria-label="Share smartlink">
        Share
      </button>
      {message && <span role="status" className="text-xs text-muted">{message}</span>}
    </span>
  )
}

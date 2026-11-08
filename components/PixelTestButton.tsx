'use client'

import { useState } from 'react'

export default function PixelTestButton({ pixelId }: { pixelId: string }) {
  const [status, setStatus] = useState<'idle' | 'sent'>('idle')

  function handleTest() {
    // Load the pixel and fire a test event
    const fbq = (window as any).fbq

    if (!fbq) {
      // Inject the base pixel if not yet loaded
      const f = window as any
      if (!f.fbq) {
        f.fbq = function (...args: any[]) {
          f.fbq.queue = f.fbq.queue || []
          f.fbq.queue.push(args)
        }
        f._fbq = f.fbq
        f.fbq.loaded = true
        f.fbq.version = '2.0'
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://connect.facebook.net/en_US/fbevents.js'
        document.head.appendChild(script)
        f.fbq('init', pixelId)
      }
    }

    ;(window as any).fbq?.('track', 'ViewContent', {
      content_name: 'TrackScaler Pixel Test',
    })

    setStatus('sent')
  }

  return (
    <div className="space-y-2">
      <button onClick={handleTest} className="btn-secondary text-xs">
        {status === 'sent' ? '✓ Event sent' : 'Fire test event'}
      </button>

      {status === 'sent' && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-300">
            <code className="font-mono">ViewContent</code> event fired. To confirm receipt:
          </p>
          <ol className="text-xs text-blue-300/80 mt-1 ml-4 list-decimal space-y-0.5">
            <li>Go to Meta Business Suite</li>
            <li>Open Events Manager → your Pixel</li>
            <li>Click the "Test Events" tab</li>
            <li>Look for the recent <strong>ViewContent</strong> event</li>
          </ol>
        </div>
      )}
    </div>
  )
}

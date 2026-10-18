'use client'

import { useState } from 'react'

export default function PixelTestButton({ pixelId }: { pixelId: string }) {
  const [status, setStatus] = useState<'idle' | 'sent'>('idle')

  function handleTest() {
    // Carrega o pixel e dispara um evento de teste
    const fbq = (window as any).fbq

    if (!fbq) {
      // Injeta o pixel base se ainda não carregado
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
      content_name: 'TrackScale Pixel Test',
    })

    setStatus('sent')
  }

  return (
    <div className="space-y-2">
      <button onClick={handleTest} className="btn-secondary text-xs">
        {status === 'sent' ? '✓ Evento enviado' : 'Disparar evento de teste'}
      </button>

      {status === 'sent' && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-300">
            Evento <code className="font-mono">ViewContent</code> disparado. Para confirmar o
            recebimento:
          </p>
          <ol className="text-xs text-blue-300/80 mt-1 ml-4 list-decimal space-y-0.5">
            <li>Acesse o Meta Business Suite</li>
            <li>Vá em Events Manager → seu Pixel</li>
            <li>Clique na aba "Test Events"</li>
            <li>Procure o evento <strong>ViewContent</strong> recente</li>
          </ol>
        </div>
      )}
    </div>
  )
}

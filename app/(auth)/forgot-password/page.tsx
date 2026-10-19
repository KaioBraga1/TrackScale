'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }
    setSent(true)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.06) 0%, var(--bg) 65%)' }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8 space-y-3">
          <div
            className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 0 24px rgba(168,85,247,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>TrackScale</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Osten Company</p>
          </div>
        </div>

        <div className="card space-y-5">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                  <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Email enviado</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Verifique a caixa de entrada de <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>. O link expira em 1 hora.
                </p>
              </div>
              <Link href="/login" className="btn-secondary w-full text-center block">Voltar ao login</Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Esqueceu sua senha?</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Informe seu email e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm rounded-lg px-3 py-2.5 animate-shake"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando…
                    </span>
                  ) : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--muted)' }}>
          <Link href="/login" style={{ color: 'var(--accent)' }} className="hover:underline">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}

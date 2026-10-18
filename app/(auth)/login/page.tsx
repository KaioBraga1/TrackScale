'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router  = useRouter()
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form     = new FormData(e.currentTarget)
    const email    = form.get('email') as string
    const password = form.get('password') as string

    const result = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)

    if (result?.error) {
      setError('Email ou senha inválidos.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.06) 0%, var(--bg) 65%)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
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

        {/* Card */}
        <div className="card space-y-6">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--muted)' }}>
          Sem conta?{' '}
          <Link href="/register" style={{ color: 'var(--accent)' }} className="hover:underline">
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  )
}

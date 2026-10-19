'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Fraca', 'Boa', 'Forte']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981']

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const name = form.get('name') as string
    const email = form.get('email') as string
    const pw = form.get('password') as string
    const confirm = form.get('confirm') as string

    if (pw !== confirm) { setError('As senhas não coincidem.'); setLoading(false); return }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pw }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erro ao criar conta.'); setLoading(false); return }

    await signIn('credentials', { email, password: pw, redirect: false })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.08) 0%, var(--bg) 65%)' }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8 space-y-3">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 0 32px rgba(168,85,247,0.35)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 7 22 7 22 13" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              Track<span style={{ color: 'var(--accent)' }}>Scale</span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Osten Company</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text)' }}>Criar conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">Nome</label>
              <input id="name" name="name" type="text" required maxLength={80} className="input" placeholder="Seu nome" autoFocus />
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="seu@email.com" />
            </div>

            <div>
              <label htmlFor="password" className="label">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--muted)' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3].map((i) => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? strengthColor[strength] : 'var(--border)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="label">Confirmar senha</label>
              <input id="confirm" name="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} className="input" placeholder="Repita a senha" />
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2.5 animate-shake"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta…
                </span>
              ) : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--muted)' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }} className="hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

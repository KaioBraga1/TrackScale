'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const justReset = searchParams.get('reset') === '1'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email') as string,
      password: form.get('password') as string,
      redirect: false,
    })

    setLoading(false)
    if (result?.error) { setError('Invalid email or password.'); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.08) 0%, var(--bg) 65%)' }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
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
            <h1 className="text-xl font-bold font-outfit" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>
              Track<span style={{ color: '#c084fc' }}>Scaler</span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Osten Company</p>
          </div>
        </div>

        <div className="card space-y-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Sign in to your account</h2>

          {justReset && (
            <div className="text-sm rounded-lg px-3 py-2.5 flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 flex-shrink-0">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Password reset successfully. Please log in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@email.com" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs transition-colors hover:underline" style={{ color: 'var(--accent)' }}>
                  Forgot password
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            </div>

            {error && (
              <p className="text-sm rounded-lg px-3 py-2.5 animate-shake"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--muted)' }}>
          No account?{' '}
          <Link href="/register" style={{ color: 'var(--accent)' }} className="hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

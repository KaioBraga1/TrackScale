'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ─── Data ─────────────────────────────────────────────────────── */

const PLATFORMS = [
  { name: 'Spotify',       color: '#1db954' },
  { name: 'Apple Music',   color: '#fc3c44' },
  { name: 'YouTube Music', color: '#ff0000' },
  { name: 'Deezer',        color: '#a238ff' },
  { name: 'Amazon Music',  color: '#00a8e0' },
  { name: 'Tidal',         color: '#ffffff' },
]

const FEATURES = [
  {
    title: 'Smart Links',
    body:  'Paste any platform URL. TrackScaler fetches artwork, title and artist automatically. You get one link that works on every player.',
  },
  {
    title: 'Real-time Analytics',
    body:  'Every click logged the moment it happens: city, country, platform chosen, device and traffic source. Data that shows up in real time.',
  },
  {
    title: 'Bot Detection',
    body:  'Click-farming and invalid traffic pollute music campaigns. Every suspicious visit is identified and isolated from your reports automatically.',
  },
  {
    title: 'Consent Manager',
    body:  'Privacy laws require consent before tracking. The consent notice is built into every smart link — no extra setup on your end.',
  },
]

const STEPS = [
  {
    title: 'Paste the music link',
    body:  'Paste any URL from Spotify, Apple Music or YouTube Music. Artwork, title and artist are fetched automatically.',
  },
  {
    title: 'Generate the smart link',
    body:  'In seconds you get a trackscaler.com/l/... link ready for Instagram, TikTok and artist bios.',
  },
  {
    title: 'Track in real time',
    body:  'Every click appears in the dashboard instantly: city, platform and whether it was human or bot. Clean data from day one.',
  },
]

const LIVE_EVENTS = [
  { city: 'São Paulo',    flag: '🇧🇷', platform: 'Spotify',       ms: 2000  },
  { city: 'Buenos Aires', flag: '🇦🇷', platform: 'Apple Music',   ms: 4500  },
  { city: 'Lisboa',       flag: '🇵🇹', platform: 'YouTube Music', ms: 7000  },
  { city: 'Bogotá',       flag: '🇨🇴', platform: 'Spotify',       ms: 3200  },
  { city: 'Rio de Janeiro', flag: '🇧🇷', platform: 'Deezer',     ms: 5800  },
  { city: 'Ciudad de México', flag: '🇲🇽', platform: 'Amazon Music', ms: 1500 },
  { city: 'Madrid',       flag: '🇪🇸', platform: 'Apple Music',   ms: 6100  },
  { city: 'Santiago',     flag: '🇨🇱', platform: 'Spotify',       ms: 2900  },
]

/* ─── Canvas spectrum ────────────────────────────────────────────── */

function useSpectrum(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    let raf: number
    let W = 0
    let H = 0
    let running = true

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = el.getBoundingClientRect()
      W = r.width
      H = r.height
      el.width  = W * dpr
      el.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    const N = 80

    const tick = (t: number) => {
      if (!running) return
      ctx.clearRect(0, 0, W, H)

      const gap    = Math.max(2, W * 0.0022)
      const barW   = (W * 0.84) / N - gap
      const startX = (W - N * (barW + gap) + gap) / 2
      const maxH   = H * 0.54

      for (let i = 0; i < N; i++) {
        const p  = i / (N - 1)
        const s1 = Math.sin(t * 0.00052 + p * 6.28)
        const s2 = Math.sin(t * 0.00110 + p * 13.0 + 1.1)
        const s3 = Math.sin(t * 0.00195 + p * 22.0 + 2.6)
        const raw = (s1 + s2 * 0.50 + s3 * 0.25) / 1.75

        const ef = Math.pow(Math.sin(p * Math.PI), 1.6)
        const h  = maxH * ef * (0.07 + 0.68 * (0.5 + 0.5 * raw))
        if (h < 1) continue

        const x = startX + i * (barW + gap)
        const y = H - h

        const g = ctx.createLinearGradient(x, y, x, H)
        g.addColorStop(0,    `rgba(168,85,247,${0.70 * ef})`)
        g.addColorStop(0.55, `rgba(168,85,247,${0.20 * ef})`)
        g.addColorStop(1,     'rgba(168,85,247,0)')
        ctx.fillStyle = g

        ctx.beginPath()
        const r4 = Math.min(3, barW / 2)
        if (typeof (ctx as unknown as Record<string, unknown>).roundRect === 'function') {
          ;(ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number[]) => void })
            .roundRect(x, y, barW, h, [r4, r4, 0, 0])
        } else {
          ctx.rect(x, y, barW, h)
        }
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
}

/* ─── Live feed ──────────────────────────────────────────────────── */

function LiveFeed() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % LIVE_EVENTS.length), 2800)
    return () => clearInterval(id)
  }, [])

  const ev = LIVE_EVENTS[idx]

  return (
    <div className="live-feed" key={idx}>
      <span className="live-dot" />
      <span className="live-text">
        {ev.flag} {ev.city}
        <span className="live-sep">→</span>
        {ev.platform}
      </span>
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────────────────── */

function ArwIcon({ cls = '' }: { cls?: string }) {
  return (
    <svg className={`arw${cls ? ` ${cls}` : ''}`} viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <path d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="16" height="16" style={{ flexShrink: 0, marginTop: '2px' }}>
      <circle cx="8" cy="8" r="7" stroke="rgba(168,85,247,0.3)" strokeWidth="1"/>
      <path d="M5 8l2 2 4-4" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ─── Smart link mockup ──────────────────────────────────────────── */

function SmartLinkMockup() {
  const links = [
    { label: 'Spotify',       color: '#1db954', bg: 'rgba(29,185,84,0.12)'   },
    { label: 'Apple Music',   color: '#fc3c44', bg: 'rgba(252,60,68,0.12)'   },
    { label: 'YouTube Music', color: '#ff0000', bg: 'rgba(255,0,0,0.10)'     },
    { label: 'Deezer',        color: '#a238ff', bg: 'rgba(162,56,255,0.12)'  },
    { label: 'Amazon Music',  color: '#00a8e0', bg: 'rgba(0,168,224,0.12)'   },
  ]
  return (
    <div className="slm-wrap">
      <div className="slm-card">
        <div className="slm-art">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
            <circle cx="12" cy="12" r="4" fill="white" fillOpacity="0.9"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="white" strokeWidth="1.5" strokeOpacity="0.35"/>
          </svg>
        </div>
        <p className="slm-title">Track Name</p>
        <p className="slm-artist">Artist</p>
        <div className="slm-links">
          {links.map((l) => (
            <div key={l.label} className="slm-btn" style={{ background: l.bg, borderColor: `${l.color}22`, color: l.color }}>
              <span>{l.label}</span>
              <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Analytics mockup ───────────────────────────────────────────── */

function AnalyticsMockup() {
  const weeks = [18, 24, 16, 33, 28, 45, 40, 58, 51, 74, 69, 93]
  const max   = Math.max(...weeks)

  return (
    <div className="am-grid">
      {/* Clicks card */}
      <div className="am-card">
        <div className="am-card-header">
          <div>
            <p className="am-label">Clicks (30d)</p>
            <p className="am-stat">4.891</p>
          </div>
          <span className="am-badge">↑ 34%</span>
        </div>
        <div className="am-bars">
          {weeks.map((v, i) => (
            <div key={i} className="am-bar" style={{
              height: `${(v / max) * 100}%`,
              background: i >= 8 ? '#a855f7' : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>
      </div>

      {/* Bot card */}
      <div className="am-card">
        <p className="am-label">Bots blocked</p>
        <p className="am-stat" style={{ marginBottom: '20px' }}>217</p>
        {[
          { label: 'Real visitors', pct: 89, color: '#a855f7' },
          { label: 'Bots detected',  pct: 11, color: 'rgba(255,255,255,0.1)' },
        ].map((r) => (
          <div key={r.label} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span className="am-row-label">{r.label}</span>
              <span className="am-row-pct">{r.pct}%</span>
            </div>
            <div className="am-track">
              <div className="am-fill" style={{ width: `${r.pct}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Platforms card */}
      <div className="am-card am-full">
        <p className="am-label" style={{ marginBottom: '16px' }}>By platform</p>
        {[
          { name: 'Spotify',     pct: 58, color: '#1db954' },
          { name: 'Apple Music', pct: 24, color: '#fc3c44' },
          { name: 'YouTube',     pct: 11, color: '#ff0000' },
          { name: 'Deezer',      pct:  7, color: '#a238ff' },
        ].map((p) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
            <span className="am-row-label" style={{ flex: 1 }}>{p.name}</span>
            <div className="am-track" style={{ width: '120px' }}>
              <div className="am-fill" style={{ width: `${p.pct}%`, background: p.color, opacity: 0.7 }} />
            </div>
            <span className="am-row-pct">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────── */

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useSpectrum(canvasRef)

  /* Entrance animation */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    const html = document.documentElement
    html.classList.add('la')
    let fired = false
    let timer: ReturnType<typeof setTimeout>
    const start = () => {
      if (fired) return
      fired = true
      clearTimeout(timer)
      html.classList.add('lg')
    }
    if (document.fonts?.ready) document.fonts.ready.then(start, start)
    timer = setTimeout(start, 900)
    return () => clearTimeout(timer)
  }, [])

  /* Scroll reveal */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          ;(e.target as HTMLElement).setAttribute('data-v', '1')
          io.unobserve(e.target)
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('[data-rv]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  /* Burger */
  useEffect(() => {
    const burger = document.getElementById('lbg')
    const menu   = document.getElementById('lmenu')
    if (!burger || !menu) return
    const open  = () => { menu.classList.add('open'); burger.setAttribute('aria-expanded', 'true')  }
    const close = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false') }
    const toggle = (e: Event) => { e.stopPropagation(); menu.classList.contains('open') ? close() : open() }
    burger.addEventListener('click', toggle)
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close))
    document.addEventListener('click', (e) => { if (menu.classList.contains('open') && !menu.contains(e.target as Node) && e.target !== burger) close() })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })
  }, [])

  return (
    <>
      <style>{STYLES}</style>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="lhero">
        <canvas ref={canvasRef} className="lcanvas" aria-hidden="true" />
        <div className="lfade" aria-hidden="true" />

        {/* Nav */}
        <header className="lnav">
          <a href="/" className="llogo">Track<span>Scaler</span></a>

          <nav className="llinks" aria-label="Principal">
            <a href="#features">Features</a>
            <a href="#analytics">Analytics</a>
            <a href="#how">How it works</a>
          </nav>

          <div className="lactions">
            <Link href="/login" className="lbtn lb-login">Log in</Link>
            <Link href="/register" className="lbtn lb-start">Sign up <ArwIcon /></Link>
          </div>

          <button id="lbg" className="lburger" aria-label="Open menu" aria-expanded="false" aria-controls="lmenu">
            <span />
          </button>
        </header>

        {/* Mobile menu */}
        <nav id="lmenu" className="lmenu" aria-label="Mobile">
          <a href="#features">Features</a>
          <a href="#analytics">Analytics</a>
          <a href="#how">How it works</a>
          <div className="lmenu-div" />
          <Link href="/login">Log in</Link>
          <Link href="/register" className="lmenu-start">Sign up <ArwIcon /></Link>
        </nav>

        {/* Hero inner */}
        <div className="lhero-inner">
          <h1 className="lh1">
            <span className="ln"><span className="ln-i">Distribute the music.</span></span>
            <span className="ln"><span className="ln-i">See where it goes.</span></span>
          </h1>

          <p className="lsub">
            Smart links for every platform. Real-time analytics.<br />
            Bot detection included — clean data from the very first click.
          </p>

          <div className="lctas">
            <Link href="/register" className="lbtn lb-lg lb-primary">
              Create smart link for free <ArwIcon cls="arw-lg" />
            </Link>
            <a href="#how" className="lbtn lb-lg lb-ghost">
              See how it works <ArwIcon cls="arw-lg" />
            </a>
          </div>

          <LiveFeed />
        </div>
      </section>

      {/* ══ BELOW FOLD ════════════════════════════════════════════════ */}
      <div className="lpage">

        {/* Platforms strip */}
        <section className="lsec plat-sec" data-rv>
          <p className="plat-label">Compatible with 50+ platforms</p>
          <div className="plat-row">
            {PLATFORMS.map((p) => (
              <span key={p.name} className="plat-dot">
                <span style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        </section>

        {/* Statement */}
        <section className="lsec stmt-sec" data-rv>
          <h2 className="stmt-h2">
            One smart link that knows<br />
            where your fan wants to listen.
          </h2>
          <p className="stmt-body">
            Paste any platform URL. TrackScaler identifies the track,
            creates a universal link and sends each visitor to the player
            they already use — no friction, no lost clicks.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="lsec feats-sec">
          <span className="sec-label" data-rv>Features</span>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="feat-row"
              data-rv
              style={{ transitionDelay: `${i * 60}ms` } as React.CSSProperties}
            >
              <span className="feat-n">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-body">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Analytics dashboard */}
        <section id="analytics" className="lsec dash-sec" data-rv>
          <div className="dash-hdr">
            <span className="sec-label">Analytics</span>
            <h2 className="dash-h2">Data that actually matters.</h2>
            <p className="dash-sub">Every click logged. Bots filtered. Real data from the start.</p>
          </div>
          <AnalyticsMockup />
        </section>

        {/* How it works */}
        <section id="how" className="lsec how-sec">
          <div data-rv>
            <span className="sec-label">How it works</span>
            <h2 className="how-h2">Three steps to launch.</h2>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="step"
                data-rv
                style={{ transitionDelay: `${(i + 1) * 80}ms` } as React.CSSProperties}
              >
                <div className="step-n">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Smart link preview */}
        <section className="lsec link-sec" data-rv>
          <SmartLinkMockup />
          <div className="link-copy">
            <span className="sec-label">Smart Link</span>
            <h2 className="link-h2">What the fan sees.</h2>
            <p className="link-body">
              The smart link detects the device and opens directly in the installed app.
              On desktop it shows all players for the fan to choose.
            </p>
            <ul className="link-checks">
              {['Opens the installed app directly', 'Customizable design per artist', 'Loads in under 1 second'].map((c) => (
                <li key={c}><CheckIcon />{c}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="lsec cta-sec" data-rv>
          <h2 className="cta-h2">
            Your next release<br />
            deserves <em>real data.</em>
          </h2>
          <p className="cta-sub">Create your account and generate your first smart link in under 2 minutes.</p>
          <Link href="/register" className="lbtn lb-cta">
            Start for free <ArwIcon cls="arw-cta" />
          </Link>
          <p className="cta-fine">No credit card. No commitment.</p>
        </section>
      </div>

      {/* Footer */}
      <footer className="lfooter">
        <span>Track<span style={{ color: '#a855f7' }}>Scale</span> · Osten Company</span>
        <div className="lfooter-links">
          <Link href="/login">Log in</Link>
          <Link href="/register">Sign up</Link>
        </div>
      </footer>
    </>
  )
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const STYLES = `
/* ── Reference unit system ─────────────────────────────────── */
:root {
  --u: min(calc(100vw / 1280), calc(100dvh / 760));
  --accent:  #a855f7;
  --ink:     #ffffff;
  --ink-2:   rgba(255,255,255,0.62);
  --glass:   rgba(0,0,0,0.76);
  --gborder: rgba(255,255,255,0.09);
  --er: cubic-bezier(.16,1,.3,1);
  --es: cubic-bezier(.25,.8,.3,1);
}
@supports not (height:100dvh) {
  :root { --u: min(calc(100vw / 1280), calc(100vh / 760)); }
}

/* ── Hero ───────────────────────────────────────────────────── */
.lhero {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #050507;
  display: flex;
  align-items: center;
  justify-content: center;
}
@supports not (height:100dvh) { .lhero { height: 100vh; } }

.lcanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.lfade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 70% at 50% 42%,
      rgba(5,5,7,0.94) 0%,
      rgba(5,5,7,0.60) 55%,
      rgba(5,5,7,0.10) 100%);
  pointer-events: none;
}

/* ── Nav ────────────────────────────────────────────────────── */
.lnav {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: calc(62 * var(--u));
  display: flex;
  align-items: center;
  padding-left:  calc(36 * var(--u));
  padding-right: calc(36 * var(--u));
  z-index: 10;
}

.llogo {
  font-family: var(--font-outfit, 'Outfit', system-ui, sans-serif);
  font-weight: 800;
  font-size: calc(17 * var(--u));
  color: var(--ink);
  text-decoration: none;
  letter-spacing: -0.04em;
  white-space: nowrap;
}
.llogo span { color: var(--accent); }

.llinks {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: calc(28 * var(--u));
}
.llinks a {
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  font-size: calc(12.5 * var(--u));
  font-weight: 500;
  transition: color 0.15s;
  white-space: nowrap;
}
.llinks a:hover { color: #fff; }

.lactions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: calc(7 * var(--u));
}

/* ── Shared button ──────────────────────────────────────────── */
.lbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 500;
  text-decoration: none;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 99px;
  transition: background 0.15s, box-shadow 0.2s;
}
.lbtn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.lb-login {
  height: calc(30 * var(--u));
  padding: 0 calc(14 * var(--u));
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.75);
  font-size: calc(12 * var(--u));
  border: 1px solid rgba(255,255,255,0.10);
  gap: 0;
}
.lb-login:hover { background: rgba(255,255,255,0.10); color: #fff; }

.lb-start {
  height: calc(30 * var(--u));
  padding-left:  calc(14 * var(--u));
  padding-right: calc(14 * var(--u));
  background: var(--accent);
  color: #fff;
  font-size: calc(12 * var(--u));
  gap: calc(6 * var(--u));
}
.lb-start:hover { background: #9333ea; }

/* ── Hero inner ─────────────────────────────────────────────── */
.lhero-inner {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: calc(860 * var(--u));
  padding: 0 calc(24 * var(--u));
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Headline ───────────────────────────────────────────────── */
.lh1 {
  margin: 0;
  font-weight: 700;
  font-size: calc(78 * var(--u));
  line-height: calc(84 * var(--u));
  letter-spacing: calc(-2.2 * var(--u));
  color: var(--ink);
}
.ln  { display: block; }
.ln-i { display: block; }

.lsub {
  margin: calc(18 * var(--u)) 0 0;
  font-size: calc(17.5 * var(--u));
  line-height: calc(27 * var(--u));
  letter-spacing: calc(-0.2 * var(--u));
  color: rgba(255,255,255,0.55);
  font-weight: 300;
  max-width: calc(640 * var(--u));
}

/* ── CTAs ───────────────────────────────────────────────────── */
.lctas {
  margin-top: calc(26 * var(--u));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--u));
  flex-wrap: wrap;
}

.lb-lg {
  height: calc(43 * var(--u));
  border-radius: calc(21.5 * var(--u));
  font-size: calc(13.5 * var(--u));
  font-weight: 600;
  letter-spacing: calc(-0.2 * var(--u));
  gap: calc(8 * var(--u));
}
.lb-primary {
  background: #fdfdfd;
  color: #050505;
  padding-left:  calc(20 * var(--u));
  padding-right: calc(21 * var(--u));
}
.lb-primary:hover { background: #fff; box-shadow: 0 0 28px rgba(253,253,253,0.12); }
.lb-ghost {
  background: var(--glass);
  color: rgba(255,255,255,0.80);
  padding: 0 calc(19 * var(--u));
  border: 1px solid var(--gborder);
  backdrop-filter: blur(2px);
}
.lb-ghost:hover { background: rgba(0,0,0,0.60); border-color: rgba(255,255,255,0.18); }

.arw { flex: 0 0 auto; display: block; }
.arw-lg { width: calc(12 * var(--u)); height: calc(10 * var(--u)); }
.arw-cta { width: 12px; height: 10px; }

/* ── Live feed ──────────────────────────────────────────────── */
.live-feed {
  margin-top: calc(28 * var(--u));
  display: inline-flex;
  align-items: center;
  gap: calc(8 * var(--u));
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 99px;
  padding: calc(5 * var(--u)) calc(14 * var(--u));
  animation: feedIn 0.3s var(--er) both;
}
@keyframes feedIn {
  from { opacity: 0; transform: translateY(4px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
.live-dot {
  width: calc(6 * var(--u));
  height: calc(6 * var(--u));
  min-width: 5px;
  min-height: 5px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16,185,129,0.6);
  flex-shrink: 0;
}
.live-text {
  font-size: calc(11.5 * var(--u));
  color: rgba(255,255,255,0.55);
  letter-spacing: 0;
}
.live-sep {
  margin: 0 calc(5 * var(--u));
  color: rgba(255,255,255,0.25);
}

/* ── Burger ─────────────────────────────────────────────────── */
.lburger {
  display: none;
  margin-left: auto;
  min-width: 38px;
  min-height: 28px;
  width: calc(42 * var(--u));
  height: calc(30 * var(--u));
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 99px;
  cursor: pointer;
  padding: 0;
}
.lburger span,
.lburger span::before,
.lburger span::after {
  display: block;
  width: 16px;
  height: 1.5px;
  background: rgba(255,255,255,0.75);
  border-radius: 2px;
  position: relative;
}
.lburger span { margin: 0 auto; }
.lburger span::before,
.lburger span::after { content: ''; position: absolute; left: 0; }
.lburger span::before { top: -5px; }
.lburger span::after  { top:  5px; }

/* ── Mobile menu ────────────────────────────────────────────── */
.lmenu {
  display: none;
  position: absolute;
  top: calc(calc(62 * var(--u)) - 4px);
  right: calc(24 * var(--u));
  width: min(320px, calc(100vw - 48px));
  background: rgba(8,8,14,0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 18px;
  padding: 10px 8px 12px;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,0.65);
  transform-origin: top right;
  z-index: 20;
}
.lmenu.open { display: flex; animation: menuIn 0.16s ease both; }
@keyframes menuIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.965); }
  to   { opacity: 1; transform: none; }
}
.lmenu a {
  color: rgba(255,255,255,0.60);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  padding: 12px 14px;
  border-radius: 11px;
  transition: background 0.15s, color 0.15s;
}
.lmenu a:hover { background: rgba(255,255,255,0.06); color: #fff; }
.lmenu-div { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 14px; }
.lmenu-start {
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent) !important;
  color: #fff !important;
  margin: 6px 8px 0;
  padding: 13px 16px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
}
.lmenu-start:hover { background: #9333ea !important; }

/* ── Entrance animations ────────────────────────────────────── */
html.la .ln      { overflow: hidden; padding-top: 0.24em; margin-top: -0.24em; }
html.la .ln-i    { transform: translateY(100%); }
html.la .llogo,
html.la .llinks a,
html.la .lb-login,
html.la .lb-start,
html.la .lburger,
html.la .lsub,
html.la .lctas .lbtn,
html.la .live-feed { opacity: 0; }

@keyframes lineRise {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes subIn {
  from { opacity: 0; transform: translateY(calc(13 * var(--u))); filter: blur(5px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes pillIn {
  from { opacity: 0; transform: translateY(calc(7 * var(--u))) scale(0.974); }
  to   { opacity: 1; transform: none; }
}
@keyframes liftIn {
  from { opacity: 0; transform: translateY(calc(8 * var(--u))); }
  to   { opacity: 1; transform: none; }
}

html.la.lg .ln-i                   { animation: lineRise 1.05s var(--er) both; }
html.la.lg .ln:nth-child(1) .ln-i  { animation-delay: 0.10s; }
html.la.lg .ln:nth-child(2) .ln-i  { animation-delay: 0.21s; }
html.la.lg .llogo                  { animation: liftIn  0.62s var(--es) 0.44s both; }
html.la.lg .llinks a               { animation: liftIn  0.55s var(--es) both; }
html.la.lg .llinks a:nth-child(1)  { animation-delay: 0.52s; }
html.la.lg .llinks a:nth-child(2)  { animation-delay: 0.56s; }
html.la.lg .llinks a:nth-child(3)  { animation-delay: 0.60s; }
html.la.lg .lsub                   { animation: subIn   0.85s var(--er) 0.56s both; }
html.la.lg .lb-login               { animation: pillIn  0.55s var(--es) 0.66s both; }
html.la.lg .lb-start               { animation: pillIn  0.55s var(--es) 0.72s both; }
html.la.lg .lburger                { animation: pillIn  0.55s var(--es) 0.66s both; }
html.la.lg .lctas .lb-primary      { animation: pillIn  0.70s var(--er) 0.88s both; }
html.la.lg .lctas .lb-ghost        { animation: pillIn  0.70s var(--er) 0.95s both; }
html.la.lg .live-feed              { animation: pillIn  0.60s var(--es) 1.08s both; }

/* ── Below fold ─────────────────────────────────────────────── */
.lpage {
  background: #050507;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 40px;
}

.lsec { /* section wrapper — no styles, children space themselves */ }

[data-rv] {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.60s var(--er), transform 0.60s var(--er);
}
[data-rv][data-v='1'] { opacity: 1; transform: none; }

.sec-label {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

/* ── Platforms ──────────────────────────────────────────────── */
.plat-sec {
  padding: 80px 0 64px;
  text-align: center;
}
.plat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.06em;
  margin: 0 0 20px;
}
.plat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 24px;
}
.plat-dot {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: rgba(255,255,255,0.40);
}
.plat-dot span {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Statement ──────────────────────────────────────────────── */
.stmt-sec {
  padding: 0 0 80px;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 80px;
}
.stmt-h2 {
  font-size: clamp(28px, 3.5vw, 46px);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.12;
  margin: 0 0 20px;
}
.stmt-body {
  font-size: 16px;
  color: rgba(238,238,248,0.52);
  line-height: 1.72;
  margin: 0;
  max-width: 560px;
}

/* ── Features ───────────────────────────────────────────────── */
.feats-sec { padding: 0 0 80px; }
.feat-row {
  display: grid;
  grid-template-columns: 52px 1fr 2.2fr;
  gap: 0 28px;
  align-items: start;
  padding: 28px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.15s;
}
.feat-row:hover { border-color: rgba(168,85,247,0.22); }
.feat-n {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.06em;
  padding-top: 3px;
}
.feat-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  line-height: 1.4;
}
.feat-body {
  font-size: 15px;
  color: rgba(238,238,248,0.52);
  line-height: 1.68;
  margin: 0;
}

/* ── Dashboard ──────────────────────────────────────────────── */
.dash-sec { padding: 0 0 80px; }
.dash-hdr { margin-bottom: 32px; }
.dash-h2 {
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.025em;
  margin: 8px 0 10px;
}
.dash-sub { font-size: 15px; color: rgba(238,238,248,0.48); margin: 0; }

.am-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 14px;
}
.am-full { grid-column: 1 / -1; }
.am-card {
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 24px;
}
.am-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.am-label {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 5px;
}
.am-stat {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1;
}
.am-badge {
  font-size: 11px;
  color: #10b981;
  background: rgba(16,185,129,0.10);
  border: 1px solid rgba(16,185,129,0.20);
  padding: 3px 8px;
  border-radius: 99px;
  font-weight: 500;
}
.am-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 48px;
}
.am-bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  transition: height 0.4s ease;
}
.am-row-label { font-size: 13px; color: rgba(238,238,248,0.55); }
.am-row-pct   { font-size: 12px; color: rgba(255,255,255,0.30); }
.am-track {
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 2px;
  overflow: hidden;
}
.am-fill { height: 100%; border-radius: 2px; }

/* ── How it works ───────────────────────────────────────────── */
.how-sec { padding: 0 0 80px; }
.how-h2 {
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.025em;
  margin: 10px 0 48px;
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
.step-n {
  font-size: 42px;
  font-weight: 800;
  color: var(--accent);
  opacity: 0.48;
  line-height: 1;
  margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}
.step-title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 10px;
}
.step-body {
  font-size: 15px;
  color: rgba(238,238,248,0.50);
  line-height: 1.65;
  margin: 0;
}

/* ── Smart link preview ─────────────────────────────────────── */
.link-sec {
  display: flex;
  gap: 64px;
  align-items: center;
  padding: 0 0 80px;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 80px;
  flex-wrap: wrap;
}
.slm-wrap { flex: 0 0 auto; }
.slm-card {
  background: #0d0d14;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 22px;
  padding: 28px;
  width: 264px;
}
.slm-art {
  width: 80px; height: 80px;
  border-radius: 14px;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slm-title  { font-size: 14px; font-weight: 600; color: #fff; text-align: center; margin: 0 0 3px; }
.slm-artist { font-size: 12px; color: rgba(255,255,255,0.38); text-align: center; margin: 0 0 20px; }
.slm-links  { display: flex; flex-direction: column; gap: 8px; }
.slm-btn {
  border: 1px solid;
  border-radius: 11px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
}

.link-copy { flex: 1; min-width: 240px; }
.link-h2 {
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.025em;
  margin: 10px 0 14px;
}
.link-body {
  font-size: 15px;
  color: rgba(238,238,248,0.52);
  line-height: 1.72;
  margin: 0 0 24px;
}
.link-checks {
  list-style: none;
  margin: 0; padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.link-checks li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: rgba(238,238,248,0.58);
}

/* ── CTA ────────────────────────────────────────────────────── */
.cta-sec {
  text-align: center;
  padding: 80px 0 100px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.cta-h2 {
  font-size: clamp(28px, 4.5vw, 56px);
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.10;
  margin: 0 0 16px;
}
.cta-h2 em { font-style: normal; color: var(--accent); }
.cta-sub {
  font-size: 16px;
  color: rgba(238,238,248,0.48);
  margin: 0 0 32px;
  line-height: 1.6;
}
.cta-fine {
  font-size: 13px;
  color: rgba(255,255,255,0.24);
  margin: 16px 0 0;
}
.lb-cta {
  display: inline-flex;
  height: 50px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  gap: 9px;
  padding-left: 26px;
  padding-right: 26px;
  background: var(--accent);
  color: #fff;
  transition: background 0.15s, box-shadow 0.2s;
}
.lb-cta:hover { background: #9333ea; box-shadow: 0 0 30px rgba(168,85,247,0.30); }

/* ── Footer ─────────────────────────────────────────────────── */
.lfooter {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 24px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 1100px;
  margin: 0 auto;
  font-size: 13px;
  color: rgba(255,255,255,0.26);
}
.lfooter-links { display: flex; gap: 20px; }
.lfooter-links a { color: rgba(255,255,255,0.26); text-decoration: none; transition: color 0.15s; }
.lfooter-links a:hover { color: rgba(255,255,255,0.55); }

/* ── Responsive: 1160px ─────────────────────────────────────── */
@media (max-width: 1160px) {
  :root {
    --u: min(
      max(0.86px, min(calc(100vw / 1280), calc(100dvh / 760))),
      calc((100vw - 72px) / 575),
      calc(100dvh / 620)
    );
  }
  .llinks, .lactions { display: none !important; }
  .lburger { display: flex !important; }
}

/* ── Responsive: 760px ──────────────────────────────────────── */
@media (max-width: 760px) {
  .lpage { padding: 0 24px; }
  .feat-row { grid-template-columns: 36px 1fr; gap: 0 14px; }
  .feat-body { grid-column: 1 / -1; margin-top: 8px; }
  .steps { grid-template-columns: 1fr; gap: 32px; }
  .link-sec { flex-direction: column-reverse; gap: 40px; }
  .slm-card { width: 100%; max-width: 300px; }
  .am-grid { grid-template-columns: 1fr; }
  .am-full { grid-column: 1; }
  .lfooter { padding: 24px; flex-direction: column; align-items: flex-start; }
}

/* ── Responsive: 552px ──────────────────────────────────────── */
@media (max-width: 552px) {
  :root { --u: 1px; }
  .lh1  { font-size: min(52px, calc((100vw - 48px) / 7.6)); line-height: 1.05; letter-spacing: -0.024em; }
  .lsub { margin-top: 16px; font-size: 15px; line-height: 1.62; }
  .lsub br { display: none; }
  .lctas { gap: 10px; }
  .lb-lg { height: 46px; border-radius: 23px; font-size: 15px; }
  .live-feed { margin-top: 24px; }
  .live-text { font-size: 12px; }
}

/* ── Responsive: 400px ──────────────────────────────────────── */
@media (max-width: 400px) {
  .lctas { flex-direction: column; align-items: center; }
  .lctas .lb-lg { width: min(100%, 280px); }
}

/* ── Reduced motion ─────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  html.la .ln { overflow: visible; padding-top: 0; margin-top: 0; }
  html.la .ln-i { transform: none; }
  html.la .llogo,
  html.la .llinks a,
  html.la .lb-login, html.la .lb-start, html.la .lburger,
  html.la .lsub, html.la .lctas .lbtn, html.la .live-feed { opacity: 1; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
`

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════════════
   TrackScaler landing.
   Hero: dark cover with a live audio-spectrum wave (the "music" cover).
   Body: light, software-forward sections — switches, dashboard fragments,
   funnel, pricing, FAQ. Brand purple accent.
   ═══════════════════════════════════════════════════════════════════════════ */

const LIVE_EVENTS = [
  { city: 'São Paulo',        cc: 'BR', platform: 'Spotify' },
  { city: 'Buenos Aires',     cc: 'AR', platform: 'Apple Music' },
  { city: 'Lisboa',           cc: 'PT', platform: 'YouTube Music' },
  { city: 'Bogotá',           cc: 'CO', platform: 'Spotify' },
  { city: 'Ciudad de México', cc: 'MX', platform: 'Deezer' },
  { city: 'Madrid',           cc: 'ES', platform: 'Apple Music' },
]

const PLANS = [
  { name: 'Starter', price: '19', line: 'For the artist who just needs the link.', features: ['5 smart links', 'Real-time organic analytics', 'Bot filtering', '1 artist'], cta: 'Start', fill: false },
  { name: 'Growth', price: '59', line: 'For who runs ads and wants the ROI.', features: ['Unlimited links', 'Meta Pixel + Conversions API', 'CPC, CPL, ROI dashboard', 'Paid + organic funnel', 'Spotify followers', '5 artists'], cta: 'Start free trial', fill: true },
  { name: 'Scale', price: '149', line: 'For the pro who lives from this.', features: ['Everything in Growth', 'Fan Data CRM', 'Creatives analytics', 'Autopilot optimization', 'Unlimited artists'], cta: 'Go Scale', fill: false },
]

const FAQS = [
  { q: 'What makes a smart link different from Linktree?', a: 'A smart link detects the fan’s device and opens the song directly in their installed app — and it fires server-side Meta events so your ad pixel learns from real conversions, not guesses.' },
  { q: 'Do I need the Meta Pixel to use TrackScaler?', a: 'No. Organic analytics, bot filtering and smart links work on every plan. The pixel, ad dashboard and ROI tracking unlock on Growth, where they belong.' },
  { q: 'How does bot filtering work?', a: 'Every visit is scored. Datacenter IPs, click-farm patterns and invalid traffic are flagged and kept out of your reports automatically, so the numbers you act on are human.' },
  { q: 'Can I see paid and organic performance together?', a: 'Yes — that’s the point. Spend, CPC, CPL and ROI from Meta sit next to your real smart-link clicks and conversions in one funnel, not two tabs.' },
  { q: 'Is my fan data mine?', a: 'On Scale, every Spotify connect builds a fan CRM you own and can export. Your audience, not a platform’s.' },
]

const FEATURES = [
  { on: true,  s: 'Track every click server-side.', fig: 'Meta Conversions API recovers events a cookie-only pixel loses.' },
  { on: false, s: 'Keep the click-farms out of your numbers.', fig: 'Invalid traffic is scored and filtered before it reaches a report.' },
  { on: true,  s: 'See paid spend beside organic clicks.', fig: 'CPC, CPL and ROI sit in the same funnel as your real visits.' },
  { on: false, s: 'Build a fan CRM you actually own.', fig: 'Every Spotify connect adds a fan you can reach again.' },
]

const STEPS = [
  { s: 'Paste any Spotify, Apple or YouTube link.', d: 'Artwork, title and artist arrive on their own. One link now works on every player.' },
  { s: 'Share it everywhere your fans are.', d: 'Instagram bio, TikTok, an ad. The link routes each fan to the app they already use.' },
  { s: 'Watch the campaign scale in real time.', d: 'Every click lands in the dashboard the moment it happens — human, bot, paid or organic.' },
]

/* ─── Canvas spectrum (the music wave cover) ─── */
function useSpectrum(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0, W = 0, H = 0, running = true
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const r = el.getBoundingClientRect()
      W = r.width; H = r.height
      el.width = W * dpr; el.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })
    const N = 84
    const tick = (t: number) => {
      if (!running) return
      ctx.clearRect(0, 0, W, H)
      const gap = Math.max(2, W * 0.0022)
      const barW = (W * 0.86) / N - gap
      const startX = (W - N * (barW + gap) + gap) / 2
      const maxH = H * 0.78
      for (let i = 0; i < N; i++) {
        const p = i / (N - 1)
        const s1 = Math.sin(t * 0.00052 + p * 6.28)
        const s2 = Math.sin(t * 0.00110 + p * 13.0 + 1.1)
        const s3 = Math.sin(t * 0.00195 + p * 22.0 + 2.6)
        const raw = (s1 + s2 * 0.5 + s3 * 0.25) / 1.75
        const ef = Math.pow(Math.sin(p * Math.PI), 1.4)
        const h = maxH * ef * (0.08 + 0.7 * (0.5 + 0.5 * raw))
        if (h < 1) continue
        const x = startX + i * (barW + gap)
        const y = H - h
        const g = ctx.createLinearGradient(x, y, x, H)
        g.addColorStop(0, `rgba(192,132,252,${0.85 * ef})`)
        g.addColorStop(0.5, `rgba(168,85,247,${0.35 * ef})`)
        g.addColorStop(1, 'rgba(124,58,237,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        const r4 = Math.min(3, barW / 2)
        if (typeof (ctx as unknown as Record<string, unknown>).roundRect === 'function') {
          ;(ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number[]) => void }).roundRect(x, y, barW, h, [r4, r4, 0, 0])
        } else { ctx.rect(x, y, barW, h) }
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [ref])
}

function LiveFeed() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % LIVE_EVENTS.length), 2800)
    return () => clearInterval(id)
  }, [])
  const ev = LIVE_EVENTS[idx]
  return (
    <div className="hero-feed" key={idx}>
      <span className="hero-feed-dot" />
      <span className="hero-feed-cc">{ev.cc}</span>
      {ev.city}<span className="hero-feed-sep">→</span>{ev.platform}
    </div>
  )
}

export default function LandingPage() {
  useReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useSpectrum(canvasRef)

  return (
    <div className="ts">
      <style>{STYLES}</style>

      {/* ── Hero cover: dark + music spectrum ── */}
      <section className="hero">
        <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
        <header className="hero-nav">
          <Link href="/" className="hero-word">Track<span>Scaler</span></Link>
          <nav className="hero-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="hero-nav-right">
            <Link href="/login" className="hero-login">Log in</Link>
            <Link href="/register" className="btn btn-accent">Start free</Link>
          </div>
        </header>

        <div className="hero-inner">
          <h1 className="hero-h1">Distribute the music.<br />See where it goes.</h1>
          <p className="hero-sub">
            The smart link that tracks every click server-side, filters the bots,
            and shows your paid and organic growth in one place.
          </p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-accent btn-lg">Create smart link for free <Arrow /></Link>
            <a href="#how" className="btn btn-dark-ghost btn-lg">See how it works <Arrow /></a>
          </div>
          <LiveFeed />
        </div>
      </section>

      <FeatureSwitches />
      <Analytics />
      <HowItWorks />
      <ProofFunnel />
      <Pricing />
      <Faq />
      <CtaBand />
      <Footer />
    </div>
  )
}

/* ─── Features as switches (the live thing) ─── */
function FeatureSwitches() {
  const [states, setStates] = useState(FEATURES.map(f => f.on))
  return (
    <section id="features" className="feat">
      <h2 className="sr">Features</h2>
      {FEATURES.map((f, i) => {
        const on = states[i]
        return (
          <button key={f.s} className={`band${on ? ' band-on' : ''}`} onClick={() => setStates(s => s.map((v, j) => j === i ? !v : v))} aria-pressed={on}>
            <span className="band-text">
              <span className="band-s">{f.s}</span>
              {on && <span className="band-fig">{f.fig}</span>}
            </span>
            <span className={`switch${on ? ' switch-on' : ''}`} aria-hidden><span className="switch-knob" /></span>
          </button>
        )
      })}
    </section>
  )
}

/* ─── Analytics showcase: real dashboard fragment ─── */
function Analytics() {
  const bars = [38, 52, 44, 67, 58, 83, 71]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <section className="analytics">
      <div className="analytics-copy">
        <h2 className="analytics-h">Every click lands on a chart you can read.</h2>
        <p className="analytics-p">
          Views, clicks and click-rate update the moment they happen — with the
          bots already stripped out, so the line you watch is the line that’s real.
        </p>
      </div>
      <div className="analytics-stack">
        <div className="dash" data-ui aria-label="The TrackScaler analytics dashboard">
          <div className="dash-head">
            <div><p className="dash-title">Midnight Drive</p><p className="dash-sub">Last 7 days · consent</p></div>
            <span className="dash-live"><i />live</span>
          </div>
          <div className="dash-metrics">
            <div className="metric"><span className="metric-v">8,210</span><span className="metric-k">Views</span></div>
            <div className="metric"><span className="metric-v">5,870</span><span className="metric-k">Clicks</span></div>
            <div className="metric metric-hl"><span className="metric-v">71.5%</span><span className="metric-k">Click-rate</span></div>
          </div>
          <div className="dash-chart">
            {bars.map((h, i) => (
              <span key={i} className="dash-col">
                <span className="dash-bar" style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                <span className="dash-day">{days[i]}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="dash-meta" data-ui aria-label="Meta Ads performance">
          <div className="dash-meta-head">
            <span className="dash-meta-tag">Meta Ads</span>
            <span className="dash-meta-period">last 28 days</span>
          </div>
          <div className="dash-meta-grid">
            <span><b>$0.42</b>CPC</span><span><b>$0.69</b>CPL</span><span><b>3.1×</b>ROI</span>
            <span><b>412K</b>reach</span><span><b>$1,840</b>spend</span><span><b>9.6K</b>clicks</span>
          </div>
          <div className="dash-spark">
            {[30, 42, 38, 55, 48, 62, 58, 74, 68, 82, 79, 94].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── How it works ─── */
function HowItWorks() {
  return (
    <section id="how" className="how">
      <h2 className="how-h">Three moves from a link to scale.</h2>
      <div className="how-grid">
        <ol className="how-list">
          {STEPS.map((st) => (
            <li key={st.s} className="how-row" data-rv>
              <p className="how-s">{st.s}</p>
              <p className="how-d">{st.d}</p>
            </li>
          ))}
        </ol>
        <div className="phone" data-ui aria-label="A smart link as a fan sees it">
          <div className="phone-cover" />
          <p className="phone-title">Midnight Drive</p>
          <p className="phone-artist">Your Artist</p>
          <div className="phone-btns">
            <span className="phone-btn"><i style={{ background: '#1db954' }} />Play on Spotify</span>
            <span className="phone-btn"><i style={{ background: '#fc3c44' }} />Apple Music</span>
            <span className="phone-btn"><i style={{ background: '#ff0000' }} />YouTube Music</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Proof funnel ─── */
function ProofFunnel() {
  const rows = [
    { k: 'Ad impressions', v: 412_800, w: 100, paid: true },
    { k: 'Ad clicks', v: 9_640, w: 74, paid: true },
    { k: 'Smart-link views', v: 8_210, w: 58, paid: false },
    { k: 'Bots filtered', v: 1_120, w: 22, paid: false },
    { k: 'Platform clicks', v: 5_870, w: 40, paid: false },
  ]
  return (
    <section className="proof">
      <div className="proof-copy">
        <h2 className="proof-h">One funnel, from the ad to the stream.</h2>
        <p className="proof-p">
          Most tools stop at the click. TrackScaler follows it: paid reach on top,
          your real conversions below, the bots pulled out of the middle.
        </p>
      </div>
      <div className="funnel" data-ui aria-label="Campaign funnel">
        <div className="funnel-head"><span>Midnight Drive — last 28 days</span><span className="funnel-tag">live</span></div>
        {rows.map((r) => (
          <div key={r.k} className="funnel-row">
            <span className="funnel-k">{r.k}</span>
            <span className="funnel-bar"><span className={`funnel-fill${r.paid ? ' funnel-paid' : ''}`} style={{ width: `${r.w}%` }} /></span>
            <span className="funnel-v">{r.v.toLocaleString('en-US')}</span>
          </div>
        ))}
        <div className="funnel-foot">
          <span><i className="fdot fdot-paid" />Paid</span>
          <span><i className="fdot" />Organic</span>
          <span className="funnel-cpc">CPC $0.42 · CPL $0.69 · ROI 3.1×</span>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ─── */
function Pricing() {
  return (
    <section id="pricing" className="price">
      <h2 className="price-h">Start small. Scale when the ads start running.</h2>
      <div className="price-grid">
        {PLANS.map((p) => (
          <div key={p.name} className={`plan${p.fill ? ' plan-fill' : ''}`} data-rv>
            <p className="plan-price"><span>$</span>{p.price}<em>/mo</em></p>
            <p className="plan-name">{p.name}</p>
            <p className="plan-line">{p.line}</p>
            <Link href={`/register?plan=${p.name.toUpperCase()}`} className={`btn plan-cta${p.fill ? ' btn-ghost-light' : ' btn-accent'}`}>{p.cta}</Link>
            <ul className="plan-feats">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── FAQ + live visitor feed fragment ─── */
function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="faq">
      <div className="faq-aside">
        <h2 className="faq-h">Questions, answered.</h2>
        <div className="feed" data-ui aria-label="Live visitor feed">
          <div className="feed-head"><p className="feed-title">Live visitors</p><span className="feed-live"><i />now</span></div>
          {[
            ['BR', 'São Paulo', 'Spotify', 'Instagram'],
            ['PT', 'Lisboa', 'Apple Music', 'TikTok'],
            ['MX', 'Ciudad de México', 'Spotify', 'Facebook'],
            ['AR', 'Buenos Aires', 'YouTube', 'Instagram'],
            ['ES', 'Madrid', 'Spotify', 'Direct'],
            ['CO', 'Bogotá', 'Deezer', 'TikTok'],
          ].map((r, i) => (
            <div key={i} className="feed-row">
              <span className="feed-cc">{r[0]}</span>
              <span className="feed-city">{r[1]}</span>
              <span className="feed-plat">{r[2]}</span>
              <span className="feed-src">{r[3]}</span>
            </div>
          ))}
          <div className="feed-foot">8,210 visits · last 7 days · bots excluded</div>
        </div>
      </div>
      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div key={f.q} className="faq-item">
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              {f.q}<span className={`faq-mark${open === i ? ' faq-mark-open' : ''}`} aria-hidden />
            </button>
            {open === i && <p className="faq-a">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section className="cta">
      <h2 className="cta-h">Your next release deserves real data.</h2>
      <Link href="/register" className="btn btn-lg btn-on-fill">Start free <Arrow /></Link>
      <p className="cta-fine">No credit card. Your first smart link in two minutes.</p>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <span className="foot-word">TrackScaler</span>
      <div className="foot-links"><Link href="/login">Log in</Link><Link href="/register">Sign up</Link><a href="#pricing">Pricing</a></div>
    </footer>
  )
}

function Arrow() {
  return <svg className="arw" viewBox="0 0 16 16" width="15" height="15" fill="none"><path d="M3 8h9M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('rv-in'), i * 70); io.unobserve(e.target) } })
    }, { threshold: 0.15, rootMargin: '0px 0px -40px' })
    document.querySelectorAll('[data-rv]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const STYLES = `
.ts {
  --bg: #eef0f3; --surface: #e4e7ec; --ink: #0b0c0e; --muted: #5d6470;
  --accent: #7c3aed; --accent-2: #a855f7; --m: clamp(20px, 4vw, 64px);
  background: var(--bg); color: var(--ink); font-family: var(--font-inter, system-ui, sans-serif); overflow-x: hidden;
}
.ts a { color: inherit; text-decoration: none; }
.ts h1, .ts h2 { font-family: var(--font-outfit, 'Outfit', sans-serif); font-weight: 700; letter-spacing: -0.035em; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: 10px; border: none; cursor: pointer; font-size: 15px; font-weight: 600; font-family: var(--font-inter, sans-serif); transition: transform .18s ease, background .18s ease; }
.btn-lg { height: 54px; padding: 0 28px; font-size: 16px; border-radius: 12px; }
.arw { transition: transform .18s ease; }
.btn:hover .arw { transform: translateX(3px); }
.ts a.btn-accent, .btn-accent { background: #5b21b6; color: #fff; }
.ts a.btn-accent:hover, .btn-accent:hover { background: #4c1d95; transform: translateY(-1px); }
.ts a.btn-dark-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); color: #fff; }
.ts a.btn-dark-ghost:hover { background: rgba(255,255,255,0.12); }
.ts a.btn-on-fill { background: #fff; color: #5b21b6; }
.ts a.btn-on-fill:hover { background: #f4f0ff; }
.ts a.btn-ghost-light { background: rgba(255,255,255,0.14); color: #fff; }
.ts a.btn-ghost-light:hover { background: rgba(255,255,255,0.22); }

/* ── Hero cover ── */
.hero { position: relative; min-height: 100dvh; background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.16) 0%, transparent 60%), #06060b; color: #fff; display: flex; flex-direction: column; overflow: hidden; }
@supports not (height:100dvh){ .hero { min-height: 100vh; } }
.hero-canvas { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 42%; display: block; pointer-events: none; }
.hero-nav { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; height: 76px; padding: 0 var(--m); }
.hero-word { font-family: var(--font-outfit, sans-serif); font-weight: 700; font-size: 19px; letter-spacing: -0.03em; color: #fff; }
.hero-word span { color: #c084fc; }
.hero-links { display: flex; gap: 28px; }
.hero-links a { font-size: 14.5px; color: rgba(255,255,255,0.6); transition: color .15s; }
.hero-links a:hover { color: #fff; }
.hero-nav-right { display: flex; align-items: center; gap: 18px; }
.hero-login { font-size: 14.5px; color: #fff; font-weight: 500; }
@media (max-width: 760px) { .hero-links { display: none; } }
.hero-inner { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 var(--m) 14vh; }
.hero-h1 { font-size: clamp(40px, 7.4vw, 104px); line-height: 0.98; letter-spacing: -0.04em; margin: 0; color: #fff; }
.hero-sub { font-size: clamp(15px, 1.6vw, 19px); line-height: 1.6; color: rgba(255,255,255,0.56); max-width: 540px; margin: 28px 0 0; }
.hero-ctas { display: flex; gap: 13px; flex-wrap: wrap; justify-content: center; margin: 36px 0 0; }
.hero-feed { display: inline-flex; align-items: center; gap: 8px; margin-top: 34px; padding: 8px 16px; border-radius: 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: rgba(255,255,255,0.8); animation: feedIn .5s ease; }
@keyframes feedIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.hero-feed-dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; }
.hero-feed-cc { font-size: 10px; font-weight: 700; color: #c084fc; background: rgba(168,85,247,0.18); padding: 2px 6px; border-radius: 4px; }
.hero-feed-sep { color: rgba(255,255,255,0.35); margin: 0 2px; }

/* ── Feature switches ── */
.band { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: 100%; min-height: clamp(132px, 20vh, 200px); padding: 0 var(--m); background: var(--bg); border: none; cursor: pointer; text-align: left; color: var(--muted); transition: background .3s ease, color .3s ease; }
.band:nth-child(odd) { background: var(--surface); }
.band-on { background: var(--ink) !important; color: #fff; }
.band-on:nth-of-type(3) { background: var(--accent) !important; }
.band-text { display: flex; flex-direction: column; gap: 10px; max-width: 72%; }
.band-s { font-family: var(--font-outfit, sans-serif); font-weight: 600; font-size: clamp(24px, 3.4vw, 52px); line-height: 1.02; letter-spacing: -0.03em; }
.band-fig { font-size: clamp(14px, 1.4vw, 17px); opacity: .8; max-width: 560px; }
.switch { width: 62px; height: 34px; border-radius: 20px; background: rgba(11,12,14,0.14); flex-shrink: 0; position: relative; transition: background .25s ease; }
.band-on .switch { background: rgba(255,255,255,0.25); }
.switch-on { background: #c084fc !important; }
.switch-knob { position: absolute; top: 4px; left: 4px; width: 26px; height: 26px; border-radius: 50%; background: #fff; transition: left .25s cubic-bezier(.22,1,.36,1); }
.switch-on .switch-knob { left: 32px; }

/* ── Analytics ── */
.analytics { padding: clamp(80px, 12vh, 160px) var(--m); display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(40px, 6vw, 88px); align-items: center; }
.analytics-h { font-size: clamp(30px, 4vw, 60px); line-height: 1; margin: 0 0 20px; max-width: 14ch; }
.analytics-p { font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6; color: var(--muted); margin: 0; max-width: 44ch; }
.analytics-stack { display: flex; flex-direction: column; gap: 14px; }
.dash { background: #121318; border-radius: 18px; padding: 24px 26px 26px; }
.dash-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.dash-title { color: #fff; font-family: var(--font-outfit, sans-serif); font-weight: 700; font-size: 16px; margin: 0; }
.dash-sub { color: rgba(255,255,255,0.45); font-size: 12px; margin: 3px 0 0; }
.dash-live { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #34d399; font-weight: 600; }
.dash-live i { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399; }
.dash-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
.metric { background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px 16px; }
.metric-hl { background: rgba(168,85,247,0.14); }
.metric-v { display: block; color: #fff; font-family: var(--font-outfit, sans-serif); font-weight: 800; font-size: 26px; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
.metric-hl .metric-v { color: #c084fc; }
.metric-k { display: block; color: rgba(255,255,255,0.45); font-size: 11px; margin-top: 6px; }
.dash-chart { display: flex; align-items: flex-end; gap: 10px; height: 150px; }
.dash-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.dash-bar { width: 100%; max-width: 38px; border-radius: 6px 6px 3px 3px; background: linear-gradient(180deg, #a855f7, #6d28d9); transform-origin: bottom; animation: grow .7s cubic-bezier(.22,1,.36,1) both; }
@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.dash-day { color: rgba(255,255,255,0.4); font-size: 11px; }
.dash-meta { background: #121318; border-radius: 16px; padding: 18px 24px; }
.dash-meta-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.dash-meta-tag { font-size: 11px; font-weight: 600; color: #818cf8; background: rgba(129,140,248,0.14); padding: 4px 10px; border-radius: 6px; }
.dash-meta-period { font-size: 11px; color: rgba(255,255,255,0.4); }
.dash-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; margin-bottom: 18px; }
.dash-meta-grid span { display: flex; flex-direction: column; color: rgba(255,255,255,0.5); font-size: 10.5px; }
.dash-meta-grid b { color: #fff; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
.dash-spark { display: flex; align-items: flex-end; gap: 4px; height: 44px; }
.dash-spark span { flex: 1; background: linear-gradient(180deg, #a855f7, #6d28d9); border-radius: 3px; }
@media (max-width: 860px) { .analytics { grid-template-columns: 1fr; } }

/* ── How ── */
.how { padding: clamp(100px, 16vh, 200px) var(--m); }
.how-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: clamp(40px, 6vw, 88px); align-items: start; }
.how-h { font-size: clamp(32px, 4.4vw, 68px); line-height: 1; margin: 0 0 clamp(48px, 7vh, 88px); max-width: 15ch; }
.how-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: clamp(32px, 5vh, 60px); }
.how-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: baseline; opacity: 0; transform: translateY(22px); transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1); }
.how-row.rv-in { opacity: 1; transform: none; }
.how-s { font-family: var(--font-outfit, sans-serif); font-weight: 600; font-size: clamp(21px, 2.3vw, 33px); line-height: 1.1; letter-spacing: -0.02em; margin: 0; }
.how-d { font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6; color: var(--muted); margin: 0; }
@media (max-width: 860px) { .how-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .how-row { grid-template-columns: 1fr; gap: 14px; } }
.phone { background: #121318; border-radius: 22px; padding: 30px 26px 34px; max-width: 360px; justify-self: center; }
.phone-cover { width: 100%; aspect-ratio: 1; border-radius: 14px; background: #5b21b6; margin-bottom: 20px; }
.phone-title { color: #fff; font-family: var(--font-outfit, sans-serif); font-weight: 700; font-size: 22px; margin: 0; text-align: center; }
.phone-artist { color: rgba(255,255,255,0.5); font-size: 14px; margin: 4px 0 20px; text-align: center; }
.phone-btns { display: flex; flex-direction: column; gap: 10px; }
.phone-btn { display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 16px; border-radius: 12px; background: rgba(255,255,255,0.07); color: #fff; font-size: 14px; font-weight: 500; }
.phone-btn i { width: 10px; height: 10px; border-radius: 3px; }

/* ── Proof ── */
.proof { padding: clamp(80px, 12vh, 160px) var(--m); display: grid; grid-template-columns: 0.85fr 1.15fr; gap: clamp(40px, 6vw, 88px); align-items: center; }
.proof-h { font-size: clamp(30px, 4vw, 60px); line-height: 1; margin: 0 0 20px; max-width: 14ch; }
.proof-p { font-size: clamp(16px, 1.4vw, 18px); line-height: 1.6; color: var(--muted); margin: 0; max-width: 42ch; }
.funnel { background: #121318; color: #fff; border-radius: 18px; padding: 26px 28px; }
.funnel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 13px; color: rgba(255,255,255,0.6); }
.funnel-tag { color: #34d399; font-weight: 600; font-size: 11px; }
.funnel-row { display: grid; grid-template-columns: 150px 1fr 74px; align-items: center; gap: 14px; padding: 9px 0; }
.funnel-k { font-size: 13px; color: rgba(255,255,255,0.7); }
.funnel-bar { height: 10px; border-radius: 6px; background: rgba(255,255,255,0.07); overflow: hidden; }
.funnel-fill { display: block; height: 100%; background: rgba(255,255,255,0.3); border-radius: 6px; }
.funnel-paid { background: var(--accent-2); }
.funnel-v { font-size: 13.5px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.funnel-foot { display: flex; align-items: center; gap: 18px; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(255,255,255,0.55); }
.funnel-foot span { display: inline-flex; align-items: center; gap: 6px; }
.fdot { width: 9px; height: 9px; border-radius: 3px; background: rgba(255,255,255,0.3); }
.fdot-paid { background: var(--accent-2); }
.funnel-cpc { margin-left: auto; }
@media (max-width: 860px) { .proof { grid-template-columns: 1fr; } }

/* ── Pricing ── */
.price { padding: clamp(80px, 12vh, 160px) var(--m); }
.price-h { font-size: clamp(30px, 4vw, 60px); line-height: 1; margin: 0 0 clamp(44px, 6vh, 72px); max-width: 16ch; }
.price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.plan { background: var(--surface); border-radius: 18px; padding: 30px 28px; opacity: 0; transform: translateY(22px); transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1); }
.plan.rv-in { opacity: 1; transform: none; }
.plan-fill { background: var(--ink); color: #fff; }
.plan-price { font-family: var(--font-outfit, sans-serif); font-weight: 800; font-size: 48px; letter-spacing: -0.03em; margin: 0 0 14px; line-height: 1; }
.plan-price span { font-size: 22px; font-weight: 600; vertical-align: super; margin-right: 2px; }
.plan-price em { font-size: 15px; font-weight: 400; font-style: normal; color: var(--muted); }
.plan-fill .plan-price em { color: rgba(255,255,255,0.5); }
.plan-name { font-family: var(--font-outfit, sans-serif); font-weight: 700; font-size: 20px; margin: 0 0 6px; }
.plan-line { font-size: 13.5px; color: var(--muted); margin: 0 0 22px; min-height: 38px; }
.plan-fill .plan-line { color: rgba(255,255,255,0.6); }
.plan-cta { width: 100%; justify-content: center; margin-bottom: 24px; }
.plan-feats { list-style: none; margin: 22px 0 0; padding: 0; display: flex; flex-direction: column; gap: 11px; font-size: 14px; }
.plan-feats li { color: var(--muted); padding-left: 20px; position: relative; }
.plan-fill .plan-feats li { color: rgba(255,255,255,0.75); }
.plan-feats li::before { content: ''; position: absolute; left: 0; top: 7px; width: 8px; height: 8px; border-radius: 3px; background: var(--accent); }
@media (max-width: 860px) { .price-grid { grid-template-columns: 1fr; max-width: 420px; } }

/* ── FAQ ── */
.faq { padding: clamp(80px, 12vh, 160px) var(--m); display: grid; grid-template-columns: 0.8fr 1.2fr; gap: clamp(40px, 6vw, 80px); align-items: start; }
.faq-h { font-size: clamp(30px, 4vw, 56px); line-height: 1; margin: 0 0 28px; }
.feed { background: #121318; border-radius: 16px; padding: 20px 22px; }
.feed-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.feed-title { color: #fff; font-family: var(--font-outfit, sans-serif); font-weight: 700; font-size: 15px; margin: 0; }
.feed-live { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #34d399; font-weight: 600; }
.feed-live i { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399; }
.feed-row { display: grid; grid-template-columns: 30px 1fr auto; grid-template-areas: 'cc city plat' 'cc src plat'; column-gap: 10px; align-items: center; padding: 10px 0; }
.feed-row + .feed-row { box-shadow: 0 -1px 0 rgba(255,255,255,0.05); }
.feed-cc { grid-area: cc; font-size: 10px; font-weight: 700; color: #c084fc; background: rgba(168,85,247,0.14); border-radius: 4px; padding: 3px 0; text-align: center; }
.feed-city { grid-area: city; color: #fff; font-size: 13px; }
.feed-src { grid-area: src; color: rgba(255,255,255,0.4); font-size: 11px; }
.feed-plat { grid-area: plat; color: #c084fc; font-size: 12px; font-weight: 500; }
.feed-foot { margin-top: 14px; padding-top: 14px; box-shadow: 0 -1px 0 rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); font-size: 11.5px; }
.faq-list { display: flex; flex-direction: column; gap: 4px; }
.faq-item { background: var(--surface); border-radius: 12px; padding: 4px 20px; }
.faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 0; background: none; border: none; cursor: pointer; text-align: left; font-family: var(--font-outfit, sans-serif); font-weight: 600; font-size: clamp(16px, 1.7vw, 21px); color: var(--ink); letter-spacing: -0.02em; }
.faq-mark { width: 16px; height: 16px; flex-shrink: 0; position: relative; }
.faq-mark::before, .faq-mark::after { content: ''; position: absolute; background: var(--accent); border-radius: 2px; transition: transform .2s ease; }
.faq-mark::before { top: 7px; left: 0; width: 16px; height: 2px; }
.faq-mark::after { top: 0; left: 7px; width: 2px; height: 16px; }
.faq-mark-open::after { transform: scaleY(0); }
.faq-a { font-size: 15.5px; line-height: 1.6; color: var(--muted); margin: 0 0 24px; max-width: 60ch; }
@media (max-width: 760px) { .faq { grid-template-columns: 1fr; gap: 28px; } }

/* ── CTA ── */
.cta { background: #5b21b6; color: #fff; padding: clamp(90px, 15vh, 180px) var(--m); text-align: center; }
.cta-h { font-size: clamp(34px, 5.4vw, 86px); line-height: 0.98; margin: 0 0 36px; }
.cta-fine { font-size: 14px; color: rgba(255,255,255,0.78); margin: 20px 0 0; }

/* ── Footer ── */
.footer { padding: clamp(48px, 8vh, 100px) var(--m) 40px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.foot-word { font-family: var(--font-outfit, sans-serif); font-weight: 800; font-size: clamp(40px, 9vw, 120px); letter-spacing: -0.04em; line-height: 0.9; }
.foot-links { display: flex; gap: 22px; font-size: 14.5px; color: var(--muted); }
.foot-links a:hover { color: var(--ink); }

@media (prefers-reduced-motion: reduce) {
  .how-row, .plan { opacity: 1; transform: none; }
}
`

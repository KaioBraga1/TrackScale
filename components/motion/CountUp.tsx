'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  /** compact: 1.2K / 3.4M formatting */
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

function formatValue(n: number, decimals: number, compact: boolean): string {
  if (compact) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * Animated count-up that triggers when scrolled into view.
 * Respects prefers-reduced-motion (jumps straight to final value).
 */
export default function CountUp({
  value, duration = 1200, decimals = 0, prefix = '', suffix = '', compact = false, className, style,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(value)
      return
    }

    const run = () => {
      if (started.current) return
      started.current = true
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        // easeOutExpo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        setDisplay(value * eased)
        if (t < 1) requestAnimationFrame(tick)
        else setDisplay(value)
      }
      requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          run()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{formatValue(display, decimals, compact)}{suffix}
    </span>
  )
}

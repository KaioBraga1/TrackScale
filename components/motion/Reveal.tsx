'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  /** delay in ms before the reveal animation starts */
  delay?: number
  /** direction the element travels from */
  from?: 'up' | 'down' | 'left' | 'right' | 'scale'
  className?: string
  style?: React.CSSProperties
  as?: keyof JSX.IntrinsicElements
}

const TRANSFORMS: Record<NonNullable<Props['from']>, string> = {
  up: 'translateY(24px)',
  down: 'translateY(-24px)',
  left: 'translateX(24px)',
  right: 'translateX(-24px)',
  scale: 'scale(0.94)',
}

/**
 * Reveals children with a smooth entrance when scrolled into view.
 * Respects prefers-reduced-motion.
 */
export default function Reveal({
  children, delay = 0, from = 'up', className, style, as = 'div',
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as React.ElementType
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : TRANSFORMS[from],
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  )
}

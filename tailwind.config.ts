import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#050507',
        surface:  '#0d0d14',
        card:     '#13131f',
        border:   '#1e1e30',
        accent: {
          DEFAULT: '#a855f7',
          hover:   '#9333ea',
          dim:     'rgba(168,85,247,0.08)',
          glow:    'rgba(168,85,247,0.14)',
        },
        muted:   '#55556a',
        success: '#10b981',
        danger:  '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
        glow:   '0 0 16px 2px rgba(168,85,247,0.14)',
        'glow-lg': '0 0 32px 8px rgba(168,85,247,0.12)',
      },
      keyframes: {
        'fade-in':     { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-in-up':  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up':    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'shake':       { '0%,100%': { transform: 'translateX(0)' }, '20%': { transform: 'translateX(-6px)' }, '60%': { transform: 'translateX(4px)' } },
        'pulse-glow':  { '0%,100%': { boxShadow: '0 0 4px rgba(168,85,247,0.2)' }, '50%': { boxShadow: '0 0 20px rgba(168,85,247,0.45)' } },
        'shimmer':     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in':     'fade-in 0.25s ease both',
        'fade-in-up':  'fade-in-up 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'slide-up':    'slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'shake':       'shake 0.35s ease',
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config

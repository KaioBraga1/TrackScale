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
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(168,85,247,0.2)' },
          '50%':       { boxShadow: '0 0 16px rgba(168,85,247,0.4)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config

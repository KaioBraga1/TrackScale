import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: { default: 'TrackScale', template: '%s | TrackScale' },
  description: 'Smart links para campanhas de música — Osten Company',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        {children}
      </body>
    </html>
  )
}

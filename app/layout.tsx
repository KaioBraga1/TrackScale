import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: { default: 'TrackScaler', template: '%s | TrackScaler' },
  description: 'Smart links for music campaigns — TrackScaler',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = cookies().get('ts-theme')?.value ?? 'dark'
  return (
    <html lang="en" data-theme={theme}>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} font-sans antialiased min-h-screen`}
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        {children}
      </body>
    </html>
  )
}

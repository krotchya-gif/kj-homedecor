import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import SeoScripts from '@/components/SeoScripts'
import Providers from '@/components/Providers'
import FontLoader from '@/components/FontLoader'

export const viewport: Viewport = {
  themeColor: '#DDC0B4'
}

export const metadata: Metadata = {
  title: 'KJ Homedecor — Gorden & Curtain Premium',
  description:
    'Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh Jabodetabek. Hub. kami untuk konsultasi gratis.',
  keywords: 'gorden, curtain, roman blind, vitras, home decor, interior, Jakarta',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KJ Homedecor'
  },
  openGraph: {
    title: 'KJ Homedecor — Gorden & Curtain Premium',
    description: 'Spesialis gorden, curtain, roman blind, dan vitras premium.',
    type: 'website'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KJ Homedecor" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700&display=swap"
          media="print"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            <SeoScripts />
            <FontLoader />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

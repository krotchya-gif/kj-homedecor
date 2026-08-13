import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import SeoScripts from '@/components/SeoScripts'
import Providers from '@/components/Providers'
import FontLoader from '@/components/FontLoader'
import { createClient } from '@/utils/supabase/server'

// Halaman statis Next.js di-cache CDN 1 tahun (s-maxage=31536000). Setelah
// deploy, HTML lama tetap di-serve CDN sementara file CSS/JS lama sudah
// terhapus -> halaman tampil tanpa CSS ("berantakan"). ISR 60 detik membuat
// HTML segar maksimal 1 menit setelah deploy baru. Aman: semua halaman
// fetch data client-side (tidak ada SSR user data / cookies).
export const revalidate = 60

export const viewport: Viewport = {
  themeColor: '#DDC0B4'
}

// Fallback statis — dipakai kalau DB tidak bisa dibaca / belum diisi SEO.
const DEFAULT_SEO = {
  title: 'KJ Homedecor — Gorden & Curtain Premium',
  description:
    'Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh Jabodetabek. Hub. kami untuk konsultasi gratis.',
  keywords: 'gorden, curtain, roman blind, vitras, home decor, interior, Jakarta',
  ogImage: undefined as string | undefined
}

// BUG-068 fix (2026-08-13): form /admin/seo menulis seo_title/seo_description/
// seo_keywords/seo_og_image ke landing_settings (key='hero') tapi meta tag layout
// HARDCODED — perubahan SEO admin tak pernah tampil. Kini meta dibaca dari DB
// (fallback DEFAULT_SEO). ISR revalidate=60 menjaga metadata tetap segar.
export async function generateMetadata(): Promise<Metadata> {
  let seo = DEFAULT_SEO
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('landing_settings')
      .select('seo_title, seo_description, seo_keywords, seo_og_image')
      .eq('key', 'hero')
      .single()
    if (data) {
      seo = {
        title: data.seo_title || DEFAULT_SEO.title,
        description: data.seo_description || DEFAULT_SEO.description,
        keywords: data.seo_keywords || DEFAULT_SEO.keywords,
        ogImage: data.seo_og_image || DEFAULT_SEO.ogImage
      }
    }
  } catch {
    seo = DEFAULT_SEO
  }

  const metadata: Metadata = {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'KJ Homedecor'
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: 'website',
      ...(seo.ogImage ? { images: [seo.ogImage] } : {})
    }
  }
  return metadata
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#cc7030" />
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

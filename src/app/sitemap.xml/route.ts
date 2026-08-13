import { createServiceClient } from '@/utils/supabase/server'

export const revalidate = 60

const DEFAULT_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kjhomedecor.com'}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kjhomedecor.com'}/catalog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('landing_settings').select('sitemap_content').eq('key', 'hero').single()

  const content = data?.sitemap_content?.trim() ? data.sitemap_content : DEFAULT_SITEMAP

  return new Response(content, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  })
}

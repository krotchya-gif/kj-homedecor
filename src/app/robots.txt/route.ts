import { createServiceClient } from '@/utils/supabase/server'

export const revalidate = 60

const DEFAULT_ROBOTS = `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kjhomedecor.com'}/sitemap.xml
`

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('landing_settings').select('robots_content').eq('key', 'hero').single()

  const content = data?.robots_content?.trim() ? data.robots_content : DEFAULT_ROBOTS

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  })
}

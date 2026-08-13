import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { toClientError } from '@/lib/api-errors'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// Security fix (2026-08-11): route ini SEBELUMNYA TANPA AUTH — siapa pun bisa menimpa
// sitemap. 083: isi file kini disimpan di DB (landing_settings.sitemap_content), bukan
// filesystem, agar persist saat redeploy. Route publik /sitemap.xml membaca dari DB.

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(req: NextRequest) {
  try {
    // Phase 2 (BUG-091): rate limit — cegah spam upload sitemap.
    const rateLimit = checkRateLimit(getClientIp(req))
    if (rateLimit.blocked) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { data: requester } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!requester || !['admin', 'owner'].includes(requester.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.endsWith('.xml')) {
      return NextResponse.json({ success: false, error: 'Only .xml files allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File terlalu besar (maks 2MB)' }, { status: 400 })
    }

    const content = await file.text()

    const { error } = await supabase
      .from('landing_settings')
      .update({ sitemap_content: content, updated_at: new Date().toISOString() })
      .eq('key', 'hero')

    if (error) {
      return NextResponse.json({ success: false, error: toClientError(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { path: '/sitemap.xml' }, error: null })
  } catch (err) {
    console.error('sitemap upload error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { toClientError } from '@/lib/api-errors'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// Security fix (2026-08-11): route ini SEBELUMNYA TANPA AUTH — siapa pun bisa menimpa
// robots.txt. 083: isi file kini disimpan di DB (landing_settings.robots_content), bukan
// filesystem, agar persist saat redeploy. Route publik /robots.txt membaca dari DB.

const MAX_FILE_SIZE = 64 * 1024 // 64KB

export async function POST(req: NextRequest) {
  try {
    // Phase 2 (BUG-091): rate limit — cegah spam upload robots.
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

    if (!file.name.endsWith('.txt')) {
      return NextResponse.json({ success: false, error: 'Only .txt files allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File terlalu besar (maks 64KB)' }, { status: 400 })
    }

    const content = await file.text()

    const { error } = await supabase
      .from('landing_settings')
      .update({ robots_content: content, updated_at: new Date().toISOString() })
      .eq('key', 'hero')

    if (error) {
      return NextResponse.json({ success: false, error: toClientError(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { path: '/robots.txt' }, error: null })
  } catch (err) {
    console.error('robots upload error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

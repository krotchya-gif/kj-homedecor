import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createClient } from '@/utils/supabase/server'

// Security fix (2026-08-11): route ini SEBELUMNYA TANPA AUTH — siapa pun bisa
// menimpa public/robots.txt. Sekarang: hanya admin/owner yang boleh.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: requester } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!requester || !['admin', 'owner'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const publicDir = path.join(process.cwd(), 'public')
    await mkdir(publicDir, { recursive: true })

    const filePath = path.join(publicDir, 'robots.txt')
    await writeFile(filePath, buffer)

    return NextResponse.json({ data: { path: '/robots.txt' }, error: null })
  } catch (err) {
    console.error('robots upload error:', err)
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

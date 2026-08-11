import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireAuth, checkRateLimit } from '@/lib/auth'

const FolderSchema = z.enum([
  'products',
  'banners',
  'portfolio',
  'evidence',
  'documents',
  'videos',
  'order_progress',
  'returns',
  'qc',
  'install',
  'survey'
])

const ALLOWED_TYPES = {
  products: ['image/jpeg', 'image/png', 'image/webp'],
  banners: ['image/jpeg', 'image/png', 'image/webp'],
  portfolio: ['image/jpeg', 'image/png', 'image/webp'],
  evidence: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  documents: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  videos: ['video/mp4', 'video/webm'],
  order_progress: ['image/jpeg', 'image/png', 'image/webp'],
  returns: ['image/jpeg', 'image/png', 'image/webp'],
  qc: ['image/jpeg', 'image/png', 'image/webp'],
  install: ['image/jpeg', 'image/png', 'image/webp'],
  survey: ['image/jpeg', 'image/png', 'image/webp']
}

const MAX_SIZES = {
  products: 5 * 1024 * 1024,
  banners: 5 * 1024 * 1024,
  portfolio: 2 * 1024 * 1024,
  evidence: 2 * 1024 * 1024,
  documents: 5 * 1024 * 1024,
  videos: 100 * 1024 * 1024,
  order_progress: 2 * 1024 * 1024,
  returns: 2 * 1024 * 1024,
  qc: 2 * 1024 * 1024,
  install: 2 * 1024 * 1024,
  survey: 5 * 1024 * 1024
}

const BUCKET = 'kj-uploads'

// Service-role client — upload langsung ke Supabase Storage (bucket kj-uploads, public).
// SEBELUMNYA: file ditulis ke public/uploads/ (disk) → HILANG saat deploy Hostinger
// (immutable) → semua preview & URL /uploads/... 404 di production. (fix 2026-08-10)
const serviceClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folderRaw = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ data: null, error: { message: 'No file provided' } }, { status: 400 })
    }

    const parsed = FolderSchema.safeParse(folderRaw)
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: 'Invalid folder' } }, { status: 400 })
    }

    const folder = parsed.data
    const allowedTypes = ALLOWED_TYPES[folder]
    const maxSize = MAX_SIZES[folder]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { data: null, error: { message: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` } },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { data: null, error: { message: `File too large. Max: ${maxSize / 1024 / 1024}MB` } },
        { status: 400 }
      )
    }

    // Validate file extension against allowed types
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const ALLOWED_EXTENSIONS: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
    }
    const allowedExts = ALLOWED_EXTENSIONS[file.type]
    if (!allowedExts || !allowedExts.includes(ext)) {
      return NextResponse.json(
        { data: null, error: { message: `Invalid file extension "${ext}" for type "${file.type}"` } },
        { status: 400 }
      )
    }
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const objectPath = `${folder}/${filename}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: upErr } = await serviceClient.storage.from(BUCKET).upload(objectPath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

    if (upErr) {
      console.error('Storage upload error:', upErr)
      return NextResponse.json({ data: null, error: { message: 'Gagal upload ke storage' } }, { status: 500 })
    }

    // Public URL permanen (Supabase Storage — tidak hilang saat deploy)
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 })
  }
}

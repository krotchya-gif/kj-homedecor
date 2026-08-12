import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

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

// Role check per folder (Security fix 2026-08-12):
// folder yang bisa disalahgunakan untuk abuse storage dibatasi ke admin/owner/finance.
const FOLDER_ROLES: Record<string, string[]> = {
  products: ['admin', 'owner'],
  banners: ['admin', 'owner'],
  portfolio: ['admin', 'owner'],
  evidence: ['admin', 'owner', 'finance', 'installer'],
  documents: ['admin', 'owner', 'finance'],
  videos: ['admin', 'owner'],
  order_progress: ['admin', 'owner', 'gudang', 'finance'],
  returns: ['admin', 'owner', 'finance'],
  qc: ['admin', 'owner', 'gudang'],
  install: ['admin', 'owner', 'installer'],
  survey: ['surveyor', 'admin', 'owner']
}

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

    // Role check per folder — cegah role operasional upload video 100MB / dokumen
    const { data: requester } = await supabase.from('users').select('role, status').eq('id', user.id).single()
    if (!requester || requester.status !== 'active' || !FOLDER_ROLES[folder].includes(requester.role)) {
      return NextResponse.json(
        { data: null, error: { message: `Forbidden: role Anda tidak bisa upload ke folder "${folder}"` } },
        { status: 403 }
      )
    }

    // Service-role client dibuat DI SINI (per-request, setelah auth) — bukan di module scope.
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const allowedTypes = ALLOWED_TYPES[folder]
    const maxSize = MAX_SIZES[folder]

    // Security fix (2026-08-11): validasi ganda —
    // (1) cek MIME dari client (spoofable),
    // (2) cek MAGIC BYTES file (bukti nyata).
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

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const objectPath = `${folder}/${filename}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Magic bytes check (2026-08-11): verifikasi isi file, bukan cuma header client.
    const isAllowedMagic =
      folder === 'videos'
        ? buffer.length > 12 &&
          ((buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[3] === 0x18) || // mp4 ftyp
            (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)) // webm
        : buffer.length > 8 &&
          ((buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) || // jpeg
            (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) || // png
            (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) || // webp RIFF
            (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)) // pdf
    if (!isAllowedMagic) {
      return NextResponse.json(
        { data: null, error: { message: 'Konten file tidak sesuai tipe yang diizinkan' } },
        { status: 400 }
      )
    }

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

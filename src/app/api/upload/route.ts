import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/auth'

// CDN upload endpoint (subdomain link.kjhomedecor.com → public_html/link/upload.php).
// File tersimpan PERMANEN sebagai file asli di server file, tidak hilang saat redeploy
// aplikasi. SEBELUMNYA: pakai Supabase Storage (blob .blob, kuota free 5GB tidak cukup
// utk foto progres 2MB × 7 progres × banyak order) — dikembalikan ke plan lokal hosting.
const CDN_UPLOAD_URL = 'https://link.kjhomedecor.com/upload.php'

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
    // Phase 2 (BUG-091): rate limit per IP — cegah abuse storage (upload DoS).
    // 60 req/menit cukup untuk upload interaktif, tapi menghentikan spam otomatis.
    const rateLimit = checkRateLimit(getClientIp(request), 60, 60_000)
    if (rateLimit.blocked) {
      return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
    }

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

    // Service-role client TIDAK dipakai lagi — upload diteruskan ke CDN (upload.php),
    // bukan ke Supabase Storage (lihat konstanta CDN_UPLOAD_URL di atas).

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

    // Magic bytes check (2026-08-11): verifikasi isi file, bukan cuma header client.
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const isAllowedMagic =
      folder === 'videos'
        ? buffer.length > 11 &&
          (((buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70)) || // mp4 ftyp (box size varies)
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

    // Deteksi tipe dari magic bytes → ekstensi file. JANGAN pakai file.name: hasil kompresi
    // browser-image-compression ber-nama "blob" → ekstensi "blob" → CDN tolak 400 Invalid file type.
    const detectMime = (b: Buffer): string => {
      if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
      if (b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
      if (b.length > 11 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
      if (b.length > 3 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
       if (b.length > 7 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'video/mp4'
      if (b.length > 3 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm'
      return ''
    }
    const MIME_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'video/mp4': 'mp4',
      'video/webm': 'webm'
    }
    const detectedMime = detectMime(buffer) || file.type
    if (!detectedMime || !allowedTypes.includes(detectedMime)) {
      return NextResponse.json(
        { data: null, error: { message: 'Konten file tidak sesuai folder yang dipilih' } },
        { status: 400 }
      )
    }
    const ext = MIME_EXT[detectedMime] || file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${random}.${ext}`

    // Teruskan file ke CDN (link.kjhomedecor.com/upload.php) — file tersimpan permanen
    // sebagai file asli di public_html/link/uploads/{folder}/.
    const cdnForm = new FormData()
    cdnForm.append('file', file, filename)
    cdnForm.append('folder', folder)

    let cdnRes: Response
    try {
      cdnRes = await fetch(CDN_UPLOAD_URL, { method: 'POST', body: cdnForm })
    } catch (fetchErr) {
      console.error('CDN upload request error:', fetchErr)
      return NextResponse.json({ data: null, error: { message: 'Gagal menghubungi server file' } }, { status: 502 })
    }

    const cdnBody = (await cdnRes.json().catch(() => null)) as { success?: boolean; url?: string; error?: string } | null

    if (!cdnRes.ok || !cdnBody?.success || !cdnBody.url) {
      console.error('CDN upload rejected:', cdnRes.status, cdnBody)
      return NextResponse.json(
        { data: null, error: { message: cdnBody?.error ?? `Upload ditolak server file (${cdnRes.status})` } },
        { status: cdnRes.status >= 400 && cdnRes.status < 500 ? cdnRes.status : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: cdnBody.url,
      filename,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 })
  }
}

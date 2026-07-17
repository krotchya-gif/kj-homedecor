import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { requireAuth, checkRateLimit } from '@/lib/auth'

const FolderSchema = z.enum([
  'products', 'banners', 'portfolio', 'evidence', 'documents',
  'videos', 'order_progress', 'returns', 'qc', 'install',
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
}

const MAX_SIZES = {
  products: 5 * 1024 * 1024,    // 5MB
  banners: 5 * 1024 * 1024,       // 5MB
  portfolio: 2 * 1024 * 1024,     // 2MB
  evidence: 2 * 1024 * 1024,      // 2MB
  documents: 5 * 1024 * 1024,    // 5MB
  videos: 100 * 1024 * 1024,     // 100MB
  order_progress: 2 * 1024 * 1024,  // 2MB
  returns: 2 * 1024 * 1024,        // 2MB
  qc: 2 * 1024 * 1024,            // 2MB
  install: 2 * 1024 * 1024,       // 2MB
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimit.blocked) {
      return NextResponse.json({ data: null, error: { message: 'Too many requests' } }, { status: 429 })
    }

    const auth = await requireAuth()
    if (auth.error) return auth.error
    const supabase = auth.supabase

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
    const folderKey = folder
    const allowedTypes = ALLOWED_TYPES[folderKey]
    const maxSize = MAX_SIZES[folderKey]

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

    // Ensure folder exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderKey)
    await mkdir(uploadDir, { recursive: true })

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Magic bytes validation to prevent MIME spoofing
    if (buffer.length > 0) {
      const magicBytes: Record<string, Uint8Array[]> = {
        'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
        'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
        'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])], // RIFF header
        'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
        'video/mp4': [new Uint8Array([0x00, 0x00, 0x00]), new Uint8Array([0x66, 0x74, 0x79, 0x70])],
        'video/webm': [new Uint8Array([0x1A, 0x45, 0xDF, 0xA3])],
      }

      const magicCheckers = magicBytes[file.type]
      if (magicCheckers) {
        const header = new Uint8Array(buffer.slice(0, 16))
        const matchesMagic = magicCheckers.some((magic) => {
          return magic.every((byte, i) => header[i] === byte)
        })
        if (!matchesMagic) {
          return NextResponse.json(
            { data: null, error: { message: 'File content does not match its declared type' } },
            { status: 400 }
          )
        }
      }
    }

    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Return public URL
    const url = `/uploads/${folderKey}/${filename}`

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 })
  }
}
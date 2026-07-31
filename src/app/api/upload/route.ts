import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
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
  'install'
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
  install: ['image/jpeg', 'image/png', 'image/webp']
}

const MAX_SIZES = {
  products: 5 * 1024 * 1024, // 5MB
  banners: 5 * 1024 * 1024, // 5MB
  portfolio: 2 * 1024 * 1024, // 2MB
  evidence: 2 * 1024 * 1024, // 2MB
  documents: 5 * 1024 * 1024, // 5MB
  videos: 100 * 1024 * 1024, // 100MB
  order_progress: 2 * 1024 * 1024, // 2MB
  returns: 2 * 1024 * 1024, // 2MB
  qc: 2 * 1024 * 1024, // 2MB
  install: 2 * 1024 * 1024 // 2MB
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

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${random}.${ext}`

    // Ensure folder exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folderKey)
    await mkdir(uploadDir, { recursive: true })

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Return public URL
    const url = `/uploads/${folderKey}/${filename}`

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

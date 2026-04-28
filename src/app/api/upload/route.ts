import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = {
  products: ['image/jpeg', 'image/png', 'image/webp'],
  banners: ['image/jpeg', 'image/png', 'image/webp'],
  portfolio: ['image/jpeg', 'image/png', 'image/webp'],
  evidence: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  documents: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}

const MAX_SIZES = {
  products: 5 * 1024 * 1024,    // 5MB
  banners: 5 * 1024 * 1024,       // 5MB
  portfolio: 2 * 1024 * 1024,     // 2MB
  evidence: 2 * 1024 * 1024,      // 2MB
  documents: 5 * 1024 * 1024,    // 5MB
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!folder || !ALLOWED_TYPES[folder as keyof typeof ALLOWED_TYPES]) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    const folderKey = folder as keyof typeof ALLOWED_TYPES
    const allowedTypes = ALLOWED_TYPES[folderKey]
    const maxSize = MAX_SIZES[folderKey]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max: ${maxSize / 1024 / 1024}MB` },
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
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

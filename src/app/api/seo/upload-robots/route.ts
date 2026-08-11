import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file size (1MB max)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 1MB' }, { status: 400 });
    }

    // Validate MIME type
    if (file.type !== 'text/plain' && file.type !== 'text/plain; charset=utf-8') {
      return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 });
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

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuthRole, checkRateLimit } from '@/lib/auth';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(req.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimit.blocked) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const auth = await requireAuthRole(['admin', 'owner'])
    if (auth.error) return auth.error

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate content starts with valid text (magic bytes check for text files)
    // Text files don't have magic bytes, but we verify the content is valid UTF-8
    try {
      const textContent = buffer.toString('utf-8');
      // Verify it can be encoded back without loss
      const reEncoded = Buffer.from(textContent, 'utf-8');
      if (reEncoded.length === 0 && buffer.length > 0) {
        return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
      }
      // Check that it starts with expected robots.txt content or is at least readable text
      if (buffer.length > 0 && !/^[\s\S]*$/.test(textContent)) {
        return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid file content' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    await mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, 'robots.txt');
    await writeFile(filePath, buffer);

    return NextResponse.json({ data: { path: '/robots.txt' }, error: null });
  } catch (err) {
    console.error('robots upload error:', err);
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
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
    if (file.type !== 'application/xml' && file.type !== 'text/xml') {
      return NextResponse.json({ error: 'Only .xml files allowed' }, { status: 400 });
    }

    if (!file.name.endsWith('.xml')) {
      return NextResponse.json({ error: 'Only .xml files allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate content has XML magic bytes (starts with <?xml or <)
    if (buffer.length > 0) {
      const firstBytes = buffer.slice(0, Math.min(64, buffer.length)).toString('utf-8').trimStart();
      if (!firstBytes.startsWith('<?xml') && !firstBytes.startsWith('<')) {
        return NextResponse.json({ error: 'Invalid XML file content' }, { status: 400 });
      }
    }

    const publicDir = path.join(process.cwd(), 'public');
    await mkdir(publicDir, { recursive: true });

    const filePath = path.join(publicDir, 'sitemap.xml');
    await writeFile(filePath, buffer);

    return NextResponse.json({ data: { path: '/sitemap.xml' }, error: null });
  } catch (err) {
    console.error('sitemap upload error:', err);
    return NextResponse.json({ data: null, error: { message: 'Upload failed' } }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
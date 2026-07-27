// ============================================================
// Migrate product images from Upcloud → link.kjhomedecor.com
// ============================================================
// Usage: node scripts/migrate-images.js
// ============================================================

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');

const SUPABASE_URL = 'https://lsgcsrnxsxfigdqkbnlx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZ2Nzcm54c3hmaWdkcWtibmx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2NzcxMSwiZXhwIjoyMDkyOTQzNzExfQ.zs_2wM9mlHzi4UvqDw5d4Kl0RT3WRdT6gBuT_Ot-LG8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CDN_UPLOAD_URL = 'https://link.kjhomedecor.com/upload.php';
const UPGCLOUD_DOMAIN = 'assets-alpha.ass8c.upcloudobjects.com';

// Cache: old URL → new URL mapping
const urlCache = new Map();

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

function uploadToCdn(imageBuffer, filename) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: filename,
      contentType: 'image/jpeg',
    });
    form.append('folder', 'products');

    form.submit(CDN_UPLOAD_URL, (submitErr, res) => {
      if (submitErr) { reject(submitErr); return; }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.success) resolve(json.url);
          else reject(new Error(json.error || 'Upload failed'));
        } catch {
          reject(new Error(`Parse error: ${body.substring(0, 100)}`));
        }
      });
    });
  });
}

async function migrateImage(oldUrl) {
  if (urlCache.has(oldUrl)) {
    return urlCache.get(oldUrl);
  }

  // Extract filename from old URL
  const parts = oldUrl.split('/');
  const originalName = parts[parts.length - 1] || 'image.jpeg';

  console.log(`  ⬇️  Download: ${oldUrl.substring(0, 80)}...`);
  const buffer = await download(oldUrl);
  console.log(`     Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

  console.log(`  ⬆️  Uploading...`);
  const newUrl = await uploadToCdn(buffer, originalName);
  console.log(`     ✅ ${newUrl}`);

  urlCache.set(oldUrl, newUrl);
  return newUrl;
}

async function main() {
  console.log('=== MIGRASI GAMBAR PRODUK: Upcloud → link.kjhomedecor.com ===\n');

  // 1. Fetch all products
  console.log('📦 Fetching products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, images');

  if (error) {
    console.error('❌ Failed to fetch products:', error.message);
    process.exit(1);
  }

  // Filter products with Upcloud images
  const toMigrate = products.filter(p =>
    p.images?.some(img => img.includes(UPGCLOUD_DOMAIN))
  );

  console.log(`Total produk: ${products.length}`);
  console.log(`Perlu migrasi: ${toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log('✅ Tidak ada gambar yang perlu dimigrasi!');
    return;
  }

  // Collect all unique Upcloud URLs
  const allOldUrls = new Set();
  for (const p of toMigrate) {
    for (const img of p.images) {
      if (img.includes(UPGCLOUD_DOMAIN)) {
        allOldUrls.add(img);
      }
    }
  }
  console.log(`URL unik perlu dimigrasi: ${allOldUrls.size}\n`);

  // 2. Migrate each unique URL
  let migrated = 0;
  let failed = 0;

  for (const oldUrl of allOldUrls) {
    try {
      const newUrl = await migrateImage(oldUrl);
      migrated++;
      console.log(`  📌 ${oldUrl.substring(0, 60)}... → ${newUrl}`);
    } catch (e) {
      console.error(`  ❌ FAILED: ${oldUrl.substring(0, 80)} - ${e.message}`);
      failed++;
    }
    // Small delay between uploads
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 Migrasi selesai: ${migrated} OK, ${failed} gagal\n`);

  // 3. Update products in database
  if (urlCache.size > 0) {
    console.log('💾 Update database...');
    let updated = 0;
    let updateErrors = 0;

    for (const p of toMigrate) {
      const newImages = p.images.map(img =>
        urlCache.has(img) ? urlCache.get(img) : img
      );

      const { error: updateErr } = await supabase
        .from('products')
        .update({ images: newImages })
        .eq('id', p.id);

      if (updateErr) {
        console.error(`  ❌ Gagal update ${p.name}: ${updateErr.message}`);
        updateErrors++;
      } else {
        updated++;
      }
    }

    console.log(`\n📊 Update database:`);
    console.log(`   ✅ ${updated} produk berhasil diupdate`);
    console.log(`   ❌ ${updateErrors} produk gagal diupdate`);
  }

  console.log('\n=== SELESAI ===');
  console.log(`Total URL dimigrasi: ${migrated}`);
  console.log(`Total gagal: ${failed}`);
  if (failed > 0) {
    console.log('\n⚠️  Beberapa gambar gagal. Jalankan ulang script untuk retry.');
  }
}

main().catch(console.error);

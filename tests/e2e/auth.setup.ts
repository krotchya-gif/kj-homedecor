import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { CREDS } from './creds'

// Login semua role dari USER.md → simpan storageState per role di .auth/<role>.json.
// Anti-ban (pelajaran sesi 59 / run sebelumnya kena rate-limit Supabase Auth):
//   1. SKIP re-login jika .auth/<role>.json masih segar (< 6 jam) + probe dashboard OK.
//   2. Saat login: jeda 3 detik antar role (bawah limit ~30 login/jam/IP).
// Di pakai semua project browser; jalankan cukup --project=chromium.

const AUTH_DIR = path.join(__dirname, '.auth')
fs.mkdirSync(AUTH_DIR, { recursive: true })

// Tulis fixture foto valid (1x1 JPEG, magic bytes FF D8 FF) — dipakai untuk
// stage yang wajib upload foto (sorted/steam/shipped/done/checklist) + bukti DP/lunas.
const PHOTO_DIR = path.join(__dirname, 'fixtures')
fs.mkdirSync(PHOTO_DIR, { recursive: true })
const JPEG_1x1 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
fs.writeFileSync(path.join(PHOTO_DIR, 'photo.jpg'), Buffer.from(JPEG_1x1, 'base64'))

const MAX_AGE_MS = 6 * 60 * 60 * 1000

function isFresh(role: string): boolean {
  const file = path.join(AUTH_DIR, `${role}.json`)
  if (!fs.existsSync(file)) return false
  const stat = fs.statSync(file)
  return Date.now() - stat.mtimeMs < MAX_AGE_MS
}

for (const c of CREDS) {
  setup(`auth: ${c.role}`, async ({ browser }) => {
    // Reuse sesi lama yang masih valid (0 login → aman dari rate-limit auth).
    if (isFresh(c.role)) {
      const probeCtx = await browser.newContext({ storageState: path.join(AUTH_DIR, `${c.role}.json`) })
      const probe = await probeCtx.newPage()
      await probe.goto(c.dash, { waitUntil: 'domcontentloaded' })
      await probe.waitForTimeout(1500)
      const ok = !probe.url().includes('/login')
      await probeCtx.close()
      if (ok) return
    }

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.locator('#email').fill(c.email)
    await page.locator('#password').fill(c.password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }),
      page.getByRole('button', { name: /masuk/i }).first().click()
    ])
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^${c.dash}`))
    await ctx.storageState({ path: path.join(AUTH_DIR, `${c.role}.json`) })
    await ctx.close()
    // pacing antar role (hindari lonjakan login → rate-limit auth)
    await page.waitForTimeout(3000)
  })
}
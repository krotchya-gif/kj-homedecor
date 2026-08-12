import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Login semua role dari USER.md → simpan storageState per role di .auth/<role>.json
const AUTH_DIR = path.join(__dirname, '.auth')
fs.mkdirSync(AUTH_DIR, { recursive: true })

// Tulis fixture foto valid (1x1 JPEG, magic bytes FF D8 FF) — dipakai untuk
// stage yang wajib upload foto (sorted/steam/shipped/done/checklist).
const PHOTO_DIR = path.join(__dirname, 'fixtures')
fs.mkdirSync(PHOTO_DIR, { recursive: true })
const JPEG_1x1 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='
fs.writeFileSync(path.join(PHOTO_DIR, 'photo.jpg'), Buffer.from(JPEG_1x1, 'base64'))

const ROLES = [
  { role: 'owner', email: 'owner@kjhomedecor.com', password: 'owner123', dash: '/owner' },
  { role: 'admin', email: 'admin@kjhomedecor.com', password: 'admin456', dash: '/admin' },
  { role: 'gudang', email: 'gudang@kjhomedecor.com', password: 'gudang789', dash: '/gudang' },
  { role: 'finance', email: 'finance@kjhomedecor.com', password: 'finance321', dash: '/finance' },
  { role: 'penjahit', email: 'penjahit@kjhomedecor.com', password: 'penjahit654', dash: '/penjahit' },
  { role: 'installer', email: 'installer@kjhomedecor.com', password: 'installer123', dash: '/installer' },
  { role: 'surveyor', email: 'surveyor@kjhomedecor.com', password: 'surveyor123', dash: '/surveyor' },
  { role: 'laundry', email: 'laundry@kjhomedecor.com', password: 'laundry123', dash: '/laundry' }
]

for (const c of ROLES) {
  setup(`auth: ${c.role}`, async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(c.email)
    await page.locator('#password').fill(c.password)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }),
      page.getByRole('button', { name: /masuk/i }).first().click()
    ])
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^${c.dash}`))
    await page.context().storageState({ path: path.join(AUTH_DIR, `${c.role}.json`) })
  })
}

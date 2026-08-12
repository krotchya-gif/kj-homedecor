import { test, expect, type Page } from '@playwright/test'

// Smoke test — verifikasi login 8 role + halaman kunci + security proxy.
// Credentials dari USER.md (akun test dev). Jalan di project chromium saja.

const CREDS = [
  { email: 'owner@kjhomedecor.com', password: 'owner123', path: '/owner', label: 'owner' },
  { email: 'admin@kjhomedecor.com', password: 'admin456', path: '/admin', label: 'admin' },
  { email: 'gudang@kjhomedecor.com', password: 'gudang789', path: '/gudang', label: 'gudang' },
  { email: 'finance@kjhomedecor.com', password: 'finance321', path: '/finance', label: 'finance' },
  { email: 'penjahit@kjhomedecor.com', password: 'penjahit654', path: '/penjahit', label: 'penjahit' },
  { email: 'installer@kjhomedecor.com', password: 'installer123', path: '/installer', label: 'installer' },
  { email: 'surveyor@kjhomedecor.com', password: 'surveyor123', path: '/surveyor', label: 'surveyor' },
  { email: 'laundry@kjhomedecor.com', password: 'laundry123', path: '/laundry', label: 'laundry' }
]

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }),
    page.getByRole('button', { name: /masuk|login/i }).first().click()
  ])
}

for (const c of CREDS) {
  test(`login ${c.label} → redirect ke /${c.label}`, async ({ page }) => {
    await login(page, c.email, c.password)
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^${c.path}`))
    // halaman dashboard render (ada konten, bukan error)
    await expect(page.locator('body')).not.toBeEmpty()
  })
}

test('security: penjahit tidak bisa akses /admin/orders (proxy redirect)', async ({ page }) => {
  await login(page, 'penjahit@kjhomedecor.com', 'penjahit654')
  await page.goto('/admin/orders')
  await page.waitForTimeout(2500)
  expect(new URL(page.url()).pathname).toMatch(/^\/penjahit/)
})

test('security: API /api/orders GET → 403 utk penjahit', async ({ page }) => {
  await login(page, 'penjahit@kjhomedecor.com', 'penjahit654')
  const res = await page.evaluate(() =>
    fetch('/api/orders', { credentials: 'include' }).then((r) => r.status)
  )
  expect(res).toBe(403)
})

test('admin: /admin/orders list render', async ({ page }) => {
  await login(page, 'admin@kjhomedecor.com', 'admin456')
  await page.goto('/admin/orders')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('gudang: /gudang/stock-opname render', async ({ page }) => {
  await login(page, 'gudang@kjhomedecor.com', 'gudang789')
  await page.goto('/gudang/stock-opname')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('finance: /finance/stock-opname render', async ({ page }) => {
  await login(page, 'finance@kjhomedecor.com', 'finance321')
  await page.goto('/finance/stock-opname')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('owner: /owner/settings render', async ({ page }) => {
  await login(page, 'owner@kjhomedecor.com', 'owner123')
  await page.goto('/owner/settings')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('finance: /finance/rekonsiliasi render', async ({ page }) => {
  await login(page, 'finance@kjhomedecor.com', 'finance321')
  await page.goto('/finance/rekonsiliasi')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

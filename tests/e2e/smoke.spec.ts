import { test, expect, type Page } from '@playwright/test'
import { CREDS } from './creds'

// Smoke test — verifikasi login 8 role + halaman kunci + security proxy.
// Credentials dari USER.md (akun test dev). Jalan di project chromium saja.

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
  test(`login ${c.role} → redirect ke ${c.dash}`, async ({ page }) => {
    await login(page, c.email, c.password)
    expect(new URL(page.url()).pathname).toMatch(new RegExp(`^${c.dash}`))
    // halaman dashboard render (ada konten, bukan error)
    await expect(page.locator('body')).not.toBeEmpty()
  })
}

const PENJAHIT = CREDS.find((c) => c.role === 'penjahit')!
const ADMIN = CREDS.find((c) => c.role === 'admin')!
const GUDANG = CREDS.find((c) => c.role === 'gudang')!
const FINANCE = CREDS.find((c) => c.role === 'finance')!
const OWNER = CREDS.find((c) => c.role === 'owner')!

test('security: penjahit tidak bisa akses /admin/orders (proxy redirect)', async ({ page }) => {
  await login(page, PENJAHIT.email, PENJAHIT.password)
  await page.goto('/admin/orders')
  await page.waitForTimeout(2500)
  expect(new URL(page.url()).pathname).toMatch(/^\/penjahit/)
})

test('security: API /api/orders GET → 403 utk penjahit', async ({ page }) => {
  await login(page, PENJAHIT.email, PENJAHIT.password)
  const res = await page.evaluate(() =>
    fetch('/api/orders', { credentials: 'include' }).then((r) => r.status)
  )
  expect(res).toBe(403)
})

test('admin: /admin/orders list render', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password)
  await page.goto('/admin/orders')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('gudang: /gudang/stock-opname render', async ({ page }) => {
  await login(page, GUDANG.email, GUDANG.password)
  await page.goto('/gudang/stock-opname')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('finance: /finance/stock-opname render', async ({ page }) => {
  await login(page, FINANCE.email, FINANCE.password)
  await page.goto('/finance/stock-opname')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('owner: /owner/settings render', async ({ page }) => {
  await login(page, OWNER.email, OWNER.password)
  await page.goto('/owner/settings')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})

test('finance: /finance/rekonsiliasi render', async ({ page }) => {
  await login(page, FINANCE.email, FINANCE.password)
  await page.goto('/finance/rekonsiliasi')
  await page.waitForSelector('body')
  await expect(page.locator('body')).not.toBeEmpty()
})
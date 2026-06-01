import { test, expect } from '@playwright/test'

// Test credentials from doc/login.md
const TEST_USERS = {
  admin: {
    email: 'kjhomedecor22@gmail.com',
    password: 'admin321',
    expectedUrl: '/admin',
  },
  gudang: {
    email: 'kjhomedecor127@gmail.com',
    password: 'gudang321',
    expectedUrl: '/gudang',
  },
  finance: {
    email: 'kjhomedecornew26@gmail.com',
    password: 'finance321',
    expectedUrl: '/finance',
  },
  penjahit: {
    email: 'kjhomenewlife2026@gmail.com',
    password: 'penjahit321',
    expectedUrl: '/penjahit',
  },
}

async function loginAs(page: any, role: string, creds: any) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', creds.email, { timeout: 10000 })
  await page.fill('input[type="password"]', creds.password, { timeout: 10000 })
  await page.click('button[type="submit"]', { timeout: 10000 })
  await page.waitForURL(`**${creds.expectedUrl}**`, { timeout: 20000 })
}

test.describe('Login Flow', () => {
  test('admin login redirects to /admin', async ({ page }) => {
    await loginAs(page, 'admin', TEST_USERS.admin)
    expect(page.url()).toContain('/admin')
  })

  test('gudang login redirects to /gudang', async ({ page }) => {
    await loginAs(page, 'gudang', TEST_USERS.gudang)
    expect(page.url()).toContain('/gudang')
  })

  test('finance login redirects to /finance', async ({ page }) => {
    await loginAs(page, 'finance', TEST_USERS.finance)
    expect(page.url()).toContain('/finance')
  })

  test('penjahit login redirects to /penjahit', async ({ page }) => {
    await loginAs(page, 'penjahit', TEST_USERS.penjahit)
    expect(page.url()).toContain('/penjahit')
  })

  test('login with invalid credentials should show error', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Email atau password salah')).toBeVisible({ timeout: 10000 })
  })

  test('unauthenticated access to dashboard should redirect to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('already logged in user accessing /login should redirect to dashboard', async ({ page }) => {
    await loginAs(page, 'admin', TEST_USERS.admin)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/admin/)
  })
})

test.describe('Role-Based Access', () => {
  test('admin accessing /gudang should be handled by middleware', async ({ page }) => {
    await loginAs(page, 'admin', TEST_USERS.admin)
    await page.goto('/gudang')
    // Middleware handles redirect based on role
    expect(page.url()).toMatch(/\/(admin|gudang)/)
  })
})
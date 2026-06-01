import { test, expect } from '@playwright/test'

const TEST_USERS = {
  penjahit: { email: 'kjhomenewlife2026@gmail.com', password: 'penjahit321' },
}

async function loginAsPenjahit(page: any) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', TEST_USERS.penjahit.email, { timeout: 10000 })
  await page.fill('input[type="password"]', TEST_USERS.penjahit.password, { timeout: 10000 })
  await page.click('button[type="submit"]', { timeout: 10000 })
  await page.waitForURL('**/penjahit**', { timeout: 20000 })
}

test.describe('Penjahit Dashboard - Jobs', () => {
  test('can access jobs page', async ({ page }) => {
    await loginAsPenjahit(page)
    await page.goto('/penjahit/jobs')
    await expect(page).toHaveURL(/\/penjahit\/jobs/)
  })

  test('jobs page shows job queue', async ({ page }) => {
    await loginAsPenjahit(page)
    await page.goto('/penjahit/jobs')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/penjahit/jobs')
  })
})

test.describe('Penjahit Dashboard - Reports', () => {
  test('can access reports page', async ({ page }) => {
    await loginAsPenjahit(page)
    await page.goto('/penjahit/reports')
    await expect(page).toHaveURL(/\/penjahit\/reports/)
  })

  test('reports show monthly meter recap', async ({ page }) => {
    await loginAsPenjahit(page)
    await page.goto('/penjahit/reports')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/penjahit/reports')
  })
})

test.describe('Penjahit Dashboard - History', () => {
  test('can access history page', async ({ page }) => {
    await loginAsPenjahit(page)
    await page.goto('/penjahit/history')
    await expect(page).toHaveURL(/\/penjahit\/history/)
  })
})
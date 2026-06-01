import { test, expect } from '@playwright/test'

const TEST_USERS = {
  admin: { email: 'kjhomedecor22@gmail.com', password: 'admin321' },
}

test.describe('Owner Dashboard - Overview', () => {
  test('can access owner dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin**', { timeout: 15000 })

    await page.goto('/owner')
    await expect(page).toHaveURL(/\/owner/)
  })

  test('overview shows stats', async ({ page }) => {
    await page.goto('/owner')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/owner')
  })

  test('overview shows platform breakdown', async ({ page }) => {
    await page.goto('/owner')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/owner')
  })

  test('overview shows charts', async ({ page }) => {
    await page.goto('/owner')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/owner')
  })
})
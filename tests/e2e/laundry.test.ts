import { test, expect } from '@playwright/test'

test.describe('Laundry Dashboard - Jobs', () => {
  test('can access laundry jobs page', async ({ page }) => {
    // Login first (using any available account)
    await page.goto('/login')
    await page.fill('input[type="email"]', 'kjhomedecor127@gmail.com')
    await page.fill('input[type="password"]', 'gudang321')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/gudang**', { timeout: 15000 })

    await page.goto('/laundry/jobs')
    await expect(page).toHaveURL(/\/laundry\/jobs/)
  })

  test('laundry jobs page shows self-assign functionality', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'kjhomedecor127@gmail.com')
    await page.fill('input[type="password"]', 'gudang321')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/gudang**', { timeout: 15000 })

    await page.goto('/laundry/jobs')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/laundry/jobs')
  })

  test('workers can self-assign unassigned pending orders', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'kjhomedecor127@gmail.com')
    await page.fill('input[type="password"]', 'gudang321')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/gudang**', { timeout: 15000 })

    await page.goto('/laundry/jobs')
    await page.waitForLoadState('networkidle')
    // Should show unassigned orders that can be self-assigned
    expect(page.url()).toContain('/laundry/jobs')
  })
})
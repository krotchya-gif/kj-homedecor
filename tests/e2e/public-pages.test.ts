import { test, expect } from '@playwright/test'

test.describe('Public Pages', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toBe('http://localhost:3000/')
  })

  test('catalog page loads', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page).toHaveURL(/\/catalog/)
  })

  test('booking page loads', async ({ page }) => {
    await page.goto('/booking')
    await expect(page).toHaveURL(/\/booking/)
  })
})
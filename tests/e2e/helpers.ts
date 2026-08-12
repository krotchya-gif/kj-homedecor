import { expect, type Browser, type Locator, type Page } from '@playwright/test'
import path from 'path'

// ===== Utilitas bersama untuk simulasi E2E =====

export const PHOTO = path.join(__dirname, 'fixtures', 'photo.jpg')
export const AUTH_DIR = path.join(__dirname, '.auth')

/** id unik ber-timestamp agar bisa dijalankan ulang tanpa bentrok. */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

/** Buka browser context dengan storageState role tertentu. */
export function roleContext(browser: Browser, role: string) {
  return browser.newContext({ storageState: path.join(AUTH_DIR, `${role}.json`) })
}

export async function openPage(browser: Browser, role: string): Promise<Page> {
  const ctx = await roleContext(browser, role)
  const page = await ctx.newPage()
  return page
}

/** Tunggu toast sukses sonner (data-sonner-toast) yang mengandung teks. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible({
    timeout: 15000
  })
}

/** Accept semua dialog confirm() native. */
export function acceptDialogs(page: Page) {
  page.on('dialog', (d) => d.accept())
}

/** Upload foto ke input file tersembunyi (label/dropzone). */
export async function uploadPhoto(page: Page | Locator, inputSelector = 'input[type="file"]') {
  await page.locator(inputSelector).first().setInputFiles(PHOTO)
}

/** Tunggu sampai halaman role berhasil dimuat (bukan 401/redirect). */
export async function gotoDashboard(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
}

/** Admin: buat produk (opsional harga) — prasyarat item gorden di order. */
export async function createProduct(page: Page, name: string, sku: string, price?: string) {
  await gotoDashboard(page, '/admin/catalog/products')
  await page.getByRole('button', { name: /tambah produk/i }).first().waitFor({ state: 'visible', timeout: 30000 })
  await page.getByRole('button', { name: /tambah produk/i }).first().click()
  const modal = page.locator('.modal-panel').last()
  await modal.getByPlaceholder('Atlas 59-1 Smokering').fill(name)
  await modal.getByPlaceholder('SKU-001').fill(sku)
  if (price) {
    await modal.locator('input[type="number"]').first().fill(price)
  }
  await modal.getByRole('button', { name: /simpan/i }).click()
  await expectToast(page, 'Produk berhasil ditambahkan')
}

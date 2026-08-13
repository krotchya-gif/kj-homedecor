import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard, createProduct } from './helpers'
import path from 'path'

// ============================================================
// HPP/BOM + KONSUMSI MATERIAL — owner HPP manual override +
// setelah produksi: verifikasi order_material_consumption & stok
// berkurang di /gudang/stock. TODO sesi 18: isi detail.
// ============================================================
test.describe.serial('HPP/BOM & konsumsi material', () => {
  test('render /owner/hpp, /owner/materials & /gudang/stock', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('HPP')
    const prodName = `Produk HPP ${ts}`

    const ownerCtx = await roleContext(browser, 'owner')
    const owner = await ownerCtx.newPage()

    await gotoDashboard(owner, '/owner/hpp')
    await expect(owner.getByPlaceholder(/cari produk/i).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: pilih produk → HPP MANUAL override → simpan → harga jual ter-update.

    await gotoDashboard(owner, '/owner/materials')
    await expect(owner.getByRole('button', { name: /tambah/i }).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: buat material baru (rate + stok) → pakai di BOM → produksi → cek konsumsi.

    const gudCtx = await roleContext(browser, 'gudang')
    const gud = await gudCtx.newPage()
    await gotoDashboard(gud, '/gudang/stock')
    await expect(gud.locator('.desktop-only').first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: catat stok material sebelum → pipeline produksi → verifikasi stok berkurang
    // + baris order_material_consumption ada (via DB check di test atau UI stok).

    await ownerCtx.close()
    await gudCtx.close()
  })
})

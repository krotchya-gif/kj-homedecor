import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// OWNER — supplier PO flow (create→Dikirim→Terima→Bayar, verifikasi
// stok masuk + jurnal hutang); PriceHistoryTab render; reset
// render + modal konfirmasi (TIDAK eksekusi); saldo awal
// finance/settings (jurnal pembuka). TODO sesi 18: isi detail.
// ============================================================
test.describe.serial('Owner: PO/supplier/reset/saldo awal', () => {
  test('render owner/suppliers (3 tab), owner/settings reset modal', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('OWN')

    const ownerCtx = await roleContext(browser, 'owner')
    const owner = await ownerCtx.newPage()

    await gotoDashboard(owner, '/owner/suppliers')
    await expect(owner).toHaveURL(/\/owner\/suppliers/)
    // TODO sesi 18: tab Suppliers (CRUD); tab Purchase Orders: buat PO → Dikirim → Terima
    // (verifikasi stok masuk) → Bayar (verifikasi jurnal hutang_paid); tab Riwayat Harga render.

    await gotoDashboard(owner, '/owner/settings')
    await expect(owner).toHaveURL(/\/owner\/settings/)
    // VERIFIKASI RENDER + MODAL KONFIRMASI (tidak eksekusi reset beneran):
    await owner.getByRole('button', { name: /reset data/i }).click()
    await expect(owner.getByText(/yakin ingin reset/i).first()).toBeVisible({ timeout: 15000 })
    await owner.getByRole('button', { name: /lanjut/i }).first().click()
    await expect(owner.getByText(/ketik.*reset/i).first()).toBeVisible({ timeout: 15000 })
    await owner.getByRole('button', { name: 'Batal' }).last().click()

    await ownerCtx.close()
  })
})

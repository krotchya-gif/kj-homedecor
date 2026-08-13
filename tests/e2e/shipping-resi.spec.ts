import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// INPUT RESI — halaman /admin/shipping: tandai packed → Input Resi
// modal (kurir + resi + wajib foto) → shipped. Pipeline-kirim sudah
// cover resi via order-detail; spec ini fokus halaman shipping.
// TODO sesi 18: isi detail.
// ============================================================
test.describe.serial('Input Resi via /admin/shipping', () => {
  test('render /admin/shipping + modal input resi', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('RSI')

    const adminCtx = await roleContext(browser, 'admin')
    const admin = await adminCtx.newPage()

    await gotoDashboard(admin, '/admin/shipping')
    await expect(admin.getByRole('button', { name: /dikemas|resi/i }).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: siapkan order ready → klik "Dikemas" → klik "Input Resi" →
    // pilih kurir + isi no. resi + upload foto wajib → "Simpan & Kirim" → status shipped.

    await adminCtx.close()
  })
})

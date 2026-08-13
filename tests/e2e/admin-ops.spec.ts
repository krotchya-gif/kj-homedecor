import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// ADMIN OPS — booking accept/buat manual/batalkan; cancel order
// (void + reversal, verifikasi tanpa jurnal hantu BUG-060);
// return order; staff CRUD; PDF Invoice/PackingList/Faktur.
// TODO sesi 18: isi detail per blok.
// ============================================================
test.describe.serial('Admin ops: booking/cancel/return/staff/PDF', () => {
  test('render admin booking, staff, orders list', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('ADM')

    const adminCtx = await roleContext(browser, 'admin')
    const admin = await adminCtx.newPage()

    await gotoDashboard(admin, '/admin/booking')
    await expect(admin.getByRole('button', { name: /tambah|terima/i }).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: buat booking manual → accept → batalkan; verifikasi status.

    await gotoDashboard(admin, '/admin/staff')
    await expect(admin.getByRole('button', { name: /tambah|buat/i }).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: create staff (role), edit role/status, delete.

    await gotoDashboard(admin, '/admin/orders')
    await expect(admin.locator('.desktop-only').first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: buka order detail → "Batalkan" (void + reversal, cek tidak ada jurnal hantu);
    // "Return" (stock in + returns row); tombol PDF Invoice/PackingList/Faktur ada.

    await adminCtx.close()
  })
})

import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// FINANCE PAYMENTS — catat bayar (DP/pelunasan + akun kas + jurnal),
// admin tambah pembayaran, finance Proses Refund (pasca migration 080).
// TODO sesi 18: isi detail.
// ============================================================
test.describe.serial('Finance payments: input bayar & refund', () => {
  test('render /finance/payments + /finance/piutang/process', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('PAY')

    const finCtx = await roleContext(browser, 'finance')
    const fin = await finCtx.newPage()

    await gotoDashboard(fin, '/finance/payments')
    await expect(fin.getByRole('button', { name: /input bayar/i }).first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: pilih order → "Input Bayar" (type DP/Lunas + akun kas) → verifikasi jurnal
    // payment_received + saldo kas naik. Lalu Approve cek bayar.

    await gotoDashboard(fin, '/finance/piutang/process')
    await expect(fin.locator('.desktop-only').first()).toBeVisible({ timeout: 15000 })
    // TODO sesi 18: faktur piutang → "Proses Retur" → verifikasi sisa tagihan berkurang + jurnal sales_return.

    // TODO sesi 18: refund — buat return order (admin) → finance "Proses Refund" →
    // verifikasi payments type=refund tersimpan (constraint migration 080) + jurnal reversal.

    await finCtx.close()
  })
})

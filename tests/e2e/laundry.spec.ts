import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// LAUNDRY — full loop (3 role): admin input task + rate →
// laundry terima → lapor selesai + kg_actual → finance payroll.
// TODO sesi 18: isi detail per blok sesuai plan (verifikasi
// angka payroll = rate × kg_actual, regresi F-55).
// ============================================================
test.describe.serial('Laundry end-to-end', () => {
  test('render halaman laundry, admin/laundry & finance/laundry-payroll', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('LND')
    const custName = `Laundry Cust ${ts}`

    // ---------- ADMIN: input task laundry + set rate ----------
    const adminCtx = await roleContext(browser, 'admin')
    const admin = await adminCtx.newPage()
    await gotoDashboard(admin, '/admin/laundry')
    await expect(admin).toHaveURL(/\/admin\/laundry/)
    // TODO sesi 18: klik "Input Laundry", isi customer/item/kg, simpan; set rate per kg.

    // ---------- LAUNDRY: terima task → lapor selesai + kg_actual ----------
    const lndCtx = await roleContext(browser, 'laundry')
    const lnd = await lndCtx.newPage()
    await gotoDashboard(lnd, '/laundry')
    await expect(lnd).toHaveURL(/\/laundry/)
    // TODO sesi 18: klik "Terima Task", lalu "Lapor Selesai" + input kg_actual + simpan.

    // ---------- FINANCE: generate payroll + mark paid ----------
    const finCtx = await roleContext(browser, 'finance')
    const fin = await finCtx.newPage()
    await gotoDashboard(fin, '/finance/laundry-payroll')
    await expect(fin).toHaveURL(/\/finance\/laundry-payroll/)
    // TODO sesi 18: generate payroll, verifikasi angka = rate × kg_actual, mark paid (jurnal muncul).

    await adminCtx.close()
    await lndCtx.close()
    await finCtx.close()
  })
})

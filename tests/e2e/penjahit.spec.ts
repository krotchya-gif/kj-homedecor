import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// PENJAHIT — job queue: mulai → lapor selesai + meter →
// auto-create steam_jobs + order auto ke steam + production_reports.
// TODO sesi 18: isi detail; pipeline selama ini pakai gudang,
// jalur penjahit belum pernah di-test.
// ============================================================
test.describe.serial('Penjahit end-to-end', () => {
  test('render job queue + reports + history', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('PJH')

    const pjhCtx = await roleContext(browser, 'penjahit')
    const pjh = await pjhCtx.newPage()

    await gotoDashboard(pjh, '/penjahit/jobs')
    await expect(pjh).toHaveURL(/\/penjahit\/jobs/)
    // TODO sesi 18: klik "Mulai Kerjakan" → "Selesai & Laporan" + input meter
    // (gorden/vitras/roman/kupu²) → verifikasi order auto ke steam + production_reports.

    await gotoDashboard(pjh, '/penjahit/reports')
    await expect(pjh).toHaveURL(/\/penjahit\/reports/)

    await gotoDashboard(pjh, '/penjahit/history')
    await expect(pjh).toHaveURL(/\/penjahit\/history/)

    await pjhCtx.close()
  })
})

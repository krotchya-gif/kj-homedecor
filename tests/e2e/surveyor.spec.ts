import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// SURVEYOR — full loop: buat survey (client + room + foto + GPS
// + tanda tangan) → simpan → edit → copy hasil / kirim WA / PDF
// → link ke order. TODO sesi 18: isi detail per blok.
// ============================================================
test.describe.serial('Surveyor end-to-end', () => {
  test('render surveyor new/detail/history + admin survey list', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('SRV')
    const clientName = `Client ${ts}`

    // ---------- SURVEYOR ----------
    const srvCtx = await roleContext(browser, 'surveyor')
    const srv = await srvCtx.newPage()

    // Buat survey baru (render form)
    await gotoDashboard(srv, '/surveyor/survey/new')
    await expect(srv).toHaveURL(/\/surveyor\/survey\/new/)
    // TODO sesi 18: isi client, tambah room (nama/ukuran/model/foto/kain/vitras/rel/hook),
    // GPS, tanda tangan, "Review & Simpan".

    // Riwayat
    await gotoDashboard(srv, '/surveyor/history')
    await expect(srv).toHaveURL(/\/surveyor\/history/)
    // TODO sesi 18: verifikasi survey tersimpan di list, klik → detail → copy hasil/WA/PDF/edit.

    // ---------- ADMIN: list survey + link ke order ----------
    const adminCtx = await roleContext(browser, 'admin')
    const admin = await adminCtx.newPage()
    await gotoDashboard(admin, '/admin/surveys')
    await expect(admin).toHaveURL(/\/admin\/surveys/)
    // TODO sesi 18: link survey ke order → blok hasil survey tampil di order detail.

    await srvCtx.close()
    await adminCtx.close()
  })
})

import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// GUDANG — stock mutasi/adjust/PO confirm; Steam FAIL→re-queue;
// QC fail; verifikasi retur (good→stock in, damaged→dispose);
// lembur; alerts→Buat PR; stock opname submit→finance approve.
// TODO sesi 18: isi detail per blok.
// ============================================================
test.describe.serial('Gudang: stock/QC-fail/retur/opname/lembur/alerts', () => {
  test('render semua halaman gudang', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('GDG')

    const gudCtx = await roleContext(browser, 'gudang')
    const gud = await gudCtx.newPage()

    await gotoDashboard(gud, '/gudang/stock')
    await expect(gud).toHaveURL(/\/gudang\/stock/)
    // TODO sesi 18: mutasi gudang↔toko, quick adjust +/-, PO delivery confirm (stok naik).

    await gotoDashboard(gud, '/gudang/steam')
    await expect(gud).toHaveURL(/\/gudang\/steam/)
    // TODO sesi 18: Steam FAIL → re-queue penjahit (order kembali production).

    await gotoDashboard(gud, '/gudang/qc')
    await expect(gud).toHaveURL(/\/gudang\/qc/)
    // TODO sesi 18: QC fail per-item; verifikasi retur (good→stock in / damaged→dispose).

    await gotoDashboard(gud, '/gudang/lembur')
    await expect(gud).toHaveURL(/\/gudang\/lembur/)

    await gotoDashboard(gud, '/gudang/alerts')
    await expect(gud).toHaveURL(/\/gudang\/alerts/)
    // TODO sesi 18: Buat PR → muncul di admin → approve → PO.

    await gotoDashboard(gud, '/gudang/stock-opname')
    await expect(gud).toHaveURL(/\/gudang\/stock-opname/)
    // TODO sesi 18: buat sesi, input hitung, kirim → finance approve → stok berubah.

    await gudCtx.close()
  })
})

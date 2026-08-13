import { test, expect } from '@playwright/test'
import { uid, roleContext, gotoDashboard } from './helpers'
import path from 'path'

// ============================================================
// FINANCE EXT — cash transfer; aset CRUD; COA/account mapping
// render; stock opname approve. TODO sesi 18: isi detail.
// ============================================================
test.describe.serial('Finance extra: transfer/aset/COA/opname', () => {
  test('render finance/cash/transfer, assets, accounts, stock-opname', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('FEX')

    const finCtx = await roleContext(browser, 'finance')
    const fin = await finCtx.newPage()

    await gotoDashboard(fin, '/finance/cash/transfer')
    await expect(fin).toHaveURL(/\/finance\/cash\/transfer/)
    // TODO sesi 18: transfer kas antar akun → verifikasi saldo & jurnal.

    await gotoDashboard(fin, '/finance/assets')
    await expect(fin).toHaveURL(/\/finance\/assets/)
    // TODO sesi 18: buat aset → verifikasi jurnal asset_purchase.

    await gotoDashboard(fin, '/finance/accounts')
    await expect(fin).toHaveURL(/\/finance\/accounts/)
    // TODO sesi 18: render COA + account mapping.

    await gotoDashboard(fin, '/finance/stock-opname')
    await expect(fin).toHaveURL(/\/finance\/stock-opname/)
    // TODO sesi 18: approve sesi stock opname → verifikasi stok gudang berubah.

    await finCtx.close()
  })
})

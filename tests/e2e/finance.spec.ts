import { test, expect } from '@playwright/test'
import { uid, expectToast, gotoDashboard } from './helpers'
import path from 'path'

// Simulasi fitur finance menyeluruh: kas/bank, pemasukan, pengeluaran, hutang,
// piutang (incl. cek duplikat invoice), jurnal, laporan, rekonsiliasi, channel.
test.describe.serial('Finance menyeluruh', () => {
  test('kas → pemasukan → pengeluaran → hutang → piutang → jurnal → laporan', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const ts = uid('FIN')
    const bankName = `Bank Simulasi ${ts}`
    const supplierName = `Supplier Simulasi ${ts}`
    const customerName = `Cust Simulasi ${ts}`
    const invoiceNo = `INV-${ts}`
    const piutangInvoice = `PIV-${ts}`

    // ---------- setup data: supplier (owner) + customer (admin) ----------
    const ownerCtx = await browser.newContext({ storageState: path.join(AUTH, 'owner.json') })
    const owner = await ownerCtx.newPage()
    await gotoDashboard(owner, '/owner/suppliers')
    await owner.getByRole('button', { name: /tambah/i }).first().click()
    const supModal = owner.locator('.modal-panel').last()
    await supModal.getByPlaceholder('PT. Kain Nusantara').fill(supplierName)
    await supModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(owner, 'Supplier berhasil ditambahkan')

    const adminCtx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const admin = await adminCtx.newPage()
    await gotoDashboard(admin, '/admin/customers')
    await admin.getByRole('button', { name: /tambah/i }).first().click()
    const custModal = admin.locator('.modal-panel').last()
    await custModal.getByPlaceholder('Nama lengkap').fill(customerName)
    await custModal.getByPlaceholder('08xxx').fill('081299999999')
    await custModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(admin, /berhasil/i)

    // ---------- FINANCE ----------
    const finCtx = await browser.newContext({ storageState: path.join(AUTH, 'finance.json') })
    const fin = await finCtx.newPage()

    // 1. Kas & Bank
    await gotoDashboard(fin, '/finance/cash')
    await fin.getByRole('button', { name: /tambah kas\/bank/i }).click()
    const kasModal = fin.locator('.modal-panel').last()
    await kasModal.locator('select').first().selectOption({ index: 1 })
    await kasModal.getByPlaceholder('BCA, Mandiri, BRI, dll').fill(bankName)
    await kasModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /berhasil ditambahkan/i)
    await expect(fin.locator('.desktop-only').getByText(bankName).first()).toBeVisible()

    // 2. Pemasukan
    await gotoDashboard(fin, '/finance/cash/income')
    await fin.getByRole('button', { name: /tambah pemasukan/i }).click()
    const incModal = fin.locator('.modal-panel').last()
    await incModal.locator('select').nth(0).selectOption({ index: 1 })
    await incModal.locator('select').nth(1).selectOption({ index: 1 })
    await incModal.locator('input[type="number"]').fill('250000')
    await incModal.getByPlaceholder(/jual aset/i).fill(`Pemasukan simulasi ${ts}`)
    await incModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /pemasukan tercatat/i)

    // 3. Pengeluaran
    await gotoDashboard(fin, '/finance/cash/expense')
    await fin.getByRole('button', { name: /tambah pengeluaran/i }).click()
    const expModal = fin.locator('.modal-panel').last()
    await expModal.locator('select').nth(0).selectOption({ index: 1 })
    await expModal.locator('select').nth(1).selectOption({ index: 1 })
    await expModal.locator('input[type="number"]').fill('100000')
    await expModal.getByPlaceholder(/listrik/i).fill(`Pengeluaran simulasi ${ts}`)
    await expModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /pengeluaran tercatat/i)

    // 4. Hutang: tambah tagihan + bayar
    await gotoDashboard(fin, '/finance/hutang')
    await fin.getByRole('button', { name: /tambah tagihan/i }).click()
    const hutModal = fin.locator('.modal-panel').last()
    await hutModal.locator('select').first().selectOption({ label: supplierName })
    await hutModal.locator('input').nth(0).fill(invoiceNo)
    await hutModal.locator('input[type="number"]').fill('300000')
    await hutModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /berhasil ditambahkan/i)
    // bayar
    const hutRow = fin.locator('tr', { hasText: invoiceNo }).first()
    await hutRow.getByRole('button', { name: 'Menu aksi' }).click()
    await fin.locator('[style*="z-index: 9999"]').getByRole('button', { name: 'Bayar', exact: true }).dispatchEvent('click')
    const payHut = fin.locator('.modal-panel').last()
    await payHut.getByRole('button', { name: /bayar/i, exact: true }).last().click()
    await expectToast(fin, /pembayaran hutang dicatat/i)

    // 5. Piutang: tambah faktur + bayar + cek duplikat
    await gotoDashboard(fin, '/finance/piutang/faktur')
    await fin.getByRole('button', { name: /tambah faktur/i }).click()
    const piuModal = fin.locator('.modal-panel').last()
    await piuModal.locator('select').nth(0).selectOption({ label: customerName })
    await piuModal.locator('input').nth(0).fill(piutangInvoice)
    await piuModal.locator('input[type="number"]').fill('200000')
    await piuModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /berhasil ditambahkan/i)
    // cek duplikat invoice (error friendly)
    await fin.getByRole('button', { name: /tambah faktur/i }).click()
    const dupModal = fin.locator('.modal-panel').last()
    await dupModal.locator('select').nth(0).selectOption({ label: customerName })
    await dupModal.locator('input').nth(0).fill(piutangInvoice)
    await dupModal.locator('input[type="number"]').fill('100000')
    await dupModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(fin, /sudah dipakai/i)
    await dupModal.getByRole('button', { name: /batal/i }).click()
    // bayar faktur
    const piuRow = fin.locator('tr', { hasText: piutangInvoice }).first()
    await piuRow.getByRole('button', { name: 'Menu aksi' }).click()
    await fin.locator('[style*="z-index: 9999"]').getByRole('button', { name: 'Bayar', exact: true }).dispatchEvent('click')
    const payPiu = fin.locator('.modal-panel').last()
    await payPiu.getByRole('button', { name: /catat pembayaran/i }).click()
    await expectToast(fin, /pembayaran piutang/i)

    // 6. Jurnal otomatis: entry dari transaksi di atas tampil
    await gotoDashboard(fin, '/finance/journal/auto')
    await expect(fin.locator('table')).not.toBeEmpty()
    await expect(fin.locator('.desktop-only').getByText(/pemasukan simulasi|pengeluaran simulasi/i).first()).toBeVisible()

    // 7. Laporan: neraca + laba rugi render
    await gotoDashboard(fin, '/finance/laporan/neraca')
    await expect(fin.getByText('ASET').first()).toBeVisible()
    await expect(fin.getByText(/total aset/i).first()).toBeVisible()
    await expect(fin.getByRole('button', { name: /download pdf/i }).first()).toBeVisible()
    await gotoDashboard(fin, '/finance/laporan/laba-rugi')
    await expect(fin.getByText('PENDAPATAN').first()).toBeVisible()
    await expect(fin.getByText(/total biaya/i).first()).toBeVisible()

    // 8. Rekonsiliasi (4 kartu)
    await gotoDashboard(fin, '/finance/rekonsiliasi')
    for (const label of ['Piutang', 'Kas', 'Revenue', 'Hutang']) {
      await expect(fin.getByRole('heading', { name: label }).first()).toBeVisible()
    }

    // 9. Piutang channel (read-only)
    await gotoDashboard(fin, '/finance/piutang/channel')
    await expect(fin.locator('table').first()).toBeVisible()

    await ownerCtx.close()
    await adminCtx.close()
    await finCtx.close()
  })
})

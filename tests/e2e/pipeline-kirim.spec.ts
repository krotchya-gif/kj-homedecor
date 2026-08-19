import { test, expect } from '@playwright/test'
import { uid, expectToast, gotoDashboard, uploadPhoto, createProduct } from './helpers'
import path from 'path'

// Simulasi pipeline KIRIM (9 tahap): new → payment_ok → sorted → production → steam → ready → packed → shipped → done
// Multi-role: admin buat produk+order+item+advance awal, finance approve, gudang produksi/steam/kemas, admin resi+selesai.
test.describe.serial('Pipeline Kirim', () => {
  test('kirim end-to-end 9 tahap', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const customerName = `Pipel Kirim ${uid('C')}`
    const prodName = `Produk Kirim ${uid('P')}`

    // ---------- ADMIN: buat produk (harga 200k/m) + order kirim + tambah item ----------
    const adminCtx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const admin = await adminCtx.newPage()
    await createProduct(admin, prodName, `SKU-${uid('K')}`, '200000')
    await gotoDashboard(admin, '/admin/orders')
    await admin.getByRole('button', { name: /buat pesanan/i }).first().click()
    const createModal = admin.locator('.modal-panel').last()
    await createModal.locator('input[placeholder*="Ketik nama"]').fill(customerName)
    await createModal.locator('input[placeholder="08xxx"]').fill('081200000001')
    await createModal.locator('input[placeholder="Alamat lengkap"]').fill('Jl. Simulasi Kirim')
    await createModal.locator('select').nth(1).selectOption('kirim')
    await createModal.locator('input[type="number"]').nth(0).fill('500000')
    await createModal.locator('input[type="number"]').nth(1).fill('500000') // DP = total → paid
    // sesi 59: bukti foto WAJIB utk DP (RPC add_order_payment_atomic menolak tanpa foto)
    await uploadPhoto(createModal)
    await expect(createModal.getByText('Bukti ter-upload').first()).toBeVisible({ timeout: 30000 })
    await createModal.getByRole('button', { name: /buat pesanan/i }).click()
    await expectToast(admin, /Pesanan berhasil dibuat/i)

    // buka detail order + tangkap order_number
    const row = admin.locator('tr', { hasText: customerName }).first()
    await row.locator('a', { hasText: /detail/i }).click()
    await admin.waitForLoadState('domcontentloaded')
    const orderNo = (await admin.locator('text=/ORD-2026/').first().textContent())?.trim() ?? ''

    // tambah item gorden (pilih produk)
    await admin.getByRole('button', { name: /tambah item/i }).click()
    const itemModal = admin.locator('.modal-panel').last()
    await itemModal.getByPlaceholder('Cari produk...').fill(prodName)
    await itemModal.getByText(prodName).last().click()
    await itemModal.locator('input[placeholder="120 x 250"]').fill('120 x 250')
    await itemModal.getByRole('button', { name: /tambah item/i, exact: true }).last().click()
    await expect(admin.getByText('120 x 250').first()).toBeVisible()

    // ---------- FINANCE: approve (order sudah paid) ----------
    const finCtx = await browser.newContext({ storageState: path.join(AUTH, 'finance.json') })
    const fin = await finCtx.newPage()
    await gotoDashboard(fin, '/finance/payments')
    const finRow = fin.locator('tr', { hasText: customerName }).first()
    // sesi 59: finance verifikasi bukti foto di Riwayat Pembayaran sebelum approve
    await finRow.getByRole('button', { name: /input bayar/i, exact: true }).click()
    await expect(fin.locator('img[alt^="Bukti"]').first()).toBeVisible({ timeout: 15000 })
    await fin.locator('tr', { hasText: customerName }).first().getByRole('button', { name: /approve/i, exact: true }).click()
    await expectToast(fin, /Pembayaran diverifikasi|approved/i)

    // ---------- ADMIN: payment_ok → sorted (foto) → production (foto) ----------
    await admin.reload()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await expect(admin.getByRole('button', { name: /Lanjut: Mulai Produksi/ })).toBeVisible()
    // sorted → production
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await expect(admin.getByRole('button', { name: /Lanjut: Submit Report/ })).toBeVisible()

    // ---------- GUDANG: produksi (assign + mulai + selesai → steam) ----------
    const gudCtx = await browser.newContext({ storageState: path.join(AUTH, 'gudang.json') })
    const gud = await gudCtx.newPage()
    await gotoDashboard(gud, '/gudang/production')
    const jobCard = gud.locator('tr', { hasText: customerName }).filter({ hasText: 'Menunggu' }).first()
    const assignBtn = jobCard.getByRole('button', { name: /penjahit/i }).first()
    if (await assignBtn.count()) {
      await assignBtn.click()
      const assignModal = gud.locator('.modal-panel').last()
      const penjahitBtn = assignModal.getByRole('button', { name: /admin penjahit/i })
      await expect(penjahitBtn).toBeVisible({ timeout: 10000 })
      await penjahitBtn.click()
    }
    await gud.reload()
    await jobCard.getByRole('button', { name: /mulai/i }).first().click()
    const warnModal = gud.locator('.modal-panel').filter({ hasText: 'Material Tidak Mencukupi' })
    if (await warnModal.count()) {
      await warnModal.getByRole('button', { name: /tetap mulai/i }).click()
    }
    await expectToast(gud, /job produksi dimulai/i)
    await gud.reload()
    // Selesai → job done → order auto ke steam
    const jobRow = gud.locator('tr', { hasText: customerName }).first()
    await jobRow.getByRole('button', { name: /selesai/i }).first().click()
    await expectToast(gud, /job produksi selesai/i)
    await gud.reload()

    // steam → ready (foto)
    await gotoDashboard(gud, '/gudang/steam')
    await gud.getByRole('button', { name: /qc jahitan \(steam\)/i }).click()
    const steamCard = gud.locator('div', { hasText: customerName }).filter({ hasText: /QC Jahitan Pass/ }).first()
    await steamCard.getByRole('button', { name: /qc jahitan pass/i }).first().click()
    const passDialog = gud.locator('[role="dialog"]').last()
    await uploadPhoto(passDialog)
    await passDialog.getByRole('button', { name: /ya, qc pass/i }).click()
    await gud.waitForTimeout(2000)

    // qc per item → kemas
    await gotoDashboard(gud, '/gudang/qc')
    const qcRow = gud.locator('tr', { hasText: customerName }).first()
    if (await qcRow.getByRole('button', { name: /qc check/i }).count()) {
      await qcRow.getByRole('button', { name: /qc check/i }).click()
      const qcModal = gud.locator('.modal-panel').last()
      await qcModal.getByLabel(/pass/i).check()
      await qcModal.getByRole('button', { name: /submit qc/i }).click()
    }
    await gud.reload()
    await expect(gud.locator('text=📦 Siap Dikemas').first()).toBeVisible()
    await expect(gud.getByText(orderNo).first()).toBeVisible({ timeout: 15000 })
    const packCard = gud.locator('div', { hasText: orderNo }).filter({ hasText: /kemas/i }).last()
    await packCard.getByRole('button', { name: /kemas/i }).click()
    await expectToast(gud, /dikemas|packed/i)

    // ---------- ADMIN: packed → shipped (foto) → done, via order detail ----------
    await gotoDashboard(admin, '/admin/orders')
    const shipRow = admin.locator('tr', { hasText: customerName }).first()
    await shipRow.locator('a', { hasText: /detail/i }).click()
    await admin.waitForLoadState('domcontentloaded')
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click() // "Lanjut: Input Resi"
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    // shipped → done
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await expect(admin.getByText('Selesai').first()).toBeVisible()

    await adminCtx.close()
    await finCtx.close()
    await gudCtx.close()
  })
})

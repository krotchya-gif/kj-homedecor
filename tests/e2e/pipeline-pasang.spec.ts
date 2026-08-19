import { test, expect } from '@playwright/test'
import { uid, expectToast, gotoDashboard, uploadPhoto, createProduct } from './helpers'
import path from 'path'

// Simulasi pipeline PASANG (10 tahap): new → payment_ok → sorted → production → steam → ready → packed → scheduled → installing → done
// Multi-role: admin buat order+item+advance+jadwal, finance approve, gudang produksi/steam/kemas, installer pasang+checklist.
test.describe.serial('Pipeline Pasang', () => {
  test('pasang end-to-end 10 tahap', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const customerName = `Pipel Pasang ${uid('C')}`
    const prodName = `Produk Pasang ${uid('P')}`
    const photo = path.join(__dirname, 'fixtures', 'photo.jpg')

    // ---------- ADMIN: buat produk (harga 200k/m) + order pasang (DP penuh → paid) ----------
    const adminCtx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const admin = await adminCtx.newPage()
    await createProduct(admin, prodName, `SKU-${uid('K')}`, '200000')
    await gotoDashboard(admin, '/admin/orders')
    await admin.getByRole('button', { name: /buat pesanan/i }).first().click()
    const createModal = admin.locator('.modal-panel').last()
    await createModal.locator('input[placeholder*="Ketik nama"]').fill(customerName)
    await createModal.locator('input[placeholder="08xxx"]').fill('081200000002')
    await createModal.locator('input[placeholder="Alamat lengkap"]').fill('Jl. Simulasi Pasang')
    await createModal.locator('select').nth(1).selectOption('pasang')
    await createModal.locator('input[type="number"]').nth(0).fill('400000')
    await createModal.locator('input[type="number"]').nth(1).fill('400000') // DP = total → paid
    // sesi 59: bukti foto WAJIB utk DP (RPC add_order_payment_atomic menolak tanpa foto)
    await uploadPhoto(createModal)
    await expect(createModal.getByText('Bukti ter-upload').first()).toBeVisible({ timeout: 30000 })
    await createModal.getByRole('button', { name: /buat pesanan/i }).click()
    await expectToast(admin, /Pesanan berhasil dibuat/i)

    const row = admin.locator('tr', { hasText: customerName }).first()
    await row.locator('a', { hasText: /detail/i }).click()
    await admin.waitForLoadState('domcontentloaded')
    const orderNo = (await admin.locator('text=/ORD-2026/').first().textContent())?.trim() ?? ''
    // tambah item gorden (pilih produk yang baru dibuat)
    await admin.getByRole('button', { name: /tambah item/i }).click()
    const itemModal = admin.locator('.modal-panel').last()
    await itemModal.getByPlaceholder('Cari produk...').fill(prodName)
    await itemModal.getByText(prodName).last().click()
    await itemModal.locator('input[placeholder="120 x 250"]').fill('100 x 200')
    await itemModal.getByRole('button', { name: /tambah item/i, exact: true }).last().click()
    await expect(admin.getByText('100 x 200').first()).toBeVisible()

    // ---------- FINANCE: approve (sudah paid) ----------
    const finCtx = await browser.newContext({ storageState: path.join(AUTH, 'finance.json') })
    const fin = await finCtx.newPage()
    await gotoDashboard(fin, '/finance/payments')
    const finRow = fin.locator('tr', { hasText: customerName }).first()
    // sesi 59: finance verifikasi bukti foto di Riwayat Pembayaran sebelum approve
    await finRow.getByRole('button', { name: /input bayar/i, exact: true }).click()
    await expect(fin.locator('img[alt^="Bukti"]').first()).toBeVisible({ timeout: 15000 })
    // tutup modal dulu — overlay-nya menutupi tombol approve di baris (kalau tidak, click ter-intercept)
    await fin.locator('.modal-panel').getByRole('button', { name: /batal/i, exact: true }).click()
    await expect(fin.locator('.modal-panel')).toHaveCount(0)
    await fin.locator('tr', { hasText: customerName }).first().getByRole('button', { name: /approve/i, exact: true }).click()
    await expectToast(fin, /Pembayaran diverifikasi|approved/i)

    // ---------- ADMIN: payment_ok → sorted (foto) → production (foto) ----------
    await admin.reload()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()

    // ---------- GUDANG: produksi → steam → ready → packed ----------
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
    const jobRow = gud.locator('tr', { hasText: customerName }).first()
    await jobRow.getByRole('button', { name: /selesai/i }).first().click()
    await expectToast(gud, /selesai|steam/i)

    await gotoDashboard(gud, '/gudang/steam')
    await gud.getByRole('button', { name: /qc jahitan \(steam\)/i }).click()
    const steamCard = gud.locator('div', { hasText: customerName }).filter({ hasText: /QC Jahitan Pass/ }).first()
    await steamCard.getByRole('button', { name: /qc jahitan pass/i }).first().click()
    const passDialog = gud.locator('[role="dialog"]').last()
    await uploadPhoto(passDialog)
    await passDialog.getByRole('button', { name: /ya, qc pass/i }).click()
    await gud.waitForTimeout(2000)

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
    const packCard = gud.locator('div', { hasText: orderNo }).filter({ hasText: /kemas/i }).last()
    await packCard.getByRole('button', { name: /kemas/i }).click()
    await expectToast(gud, /dikemas|packed/i)

    // ---------- ADMIN: jadwalkan pasang (packed → scheduled) ----------
    await gotoDashboard(admin, '/admin/orders')
    const schRow = admin.locator('tr', { hasText: customerName }).first()
    await schRow.locator('a', { hasText: /detail/i }).click()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click() // "Lanjut: Jadwalkan Pasang"
    const schModal = admin.locator('.modal-panel').last()
    await schModal.locator('input[type="date"]').fill('2030-01-15')
    await schModal.locator('select').first().selectOption({ index: 1 })
    await schModal.getByRole('button', { name: /jadwalkan/i }).click()
    await expectToast(admin, /terjadwal|scheduled/i)

    // ---------- INSTALLER: mulai pasang → installing ----------
    const insCtx = await browser.newContext({ storageState: path.join(AUTH, 'installer.json') })
    const ins = await insCtx.newPage()
    await gotoDashboard(ins, '/installer/schedule')
    await ins.getByRole('button', { name: /mulai pasang/i }).first().click()
    await expectToast(ins, /status booking|in_progress/i)

    // ---------- INSTALLER: checklist → done ----------
    await gotoDashboard(ins, '/installer/checklist')
    await ins.locator('select').first().selectOption({ index: 1 }) // Pilih Booking
    await ins.waitForTimeout(1500)
    // klik 3 item checklist (div onclick)
    const rows = ins.locator('div[style*="cursor: pointer"]')
    const n = await rows.count()
    await rows.nth(0).click()
    if (n > 1) await rows.nth(1).click()
    if (n > 2) await rows.nth(2).click()
    // upload 3 foto (input tunggal — upload berulang)
    const fileInput = ins.locator('input[type="file"]').first()
    await fileInput.setInputFiles(photo)
    await fileInput.setInputFiles(photo)
    await fileInput.setInputFiles(photo)
    await ins.getByRole('button', { name: /selesaikan checklist/i }).click()
    await expectToast(ins, /selesai|checklist/i)

    // ---------- ADMIN: verifikasi Selesai ----------
    await gotoDashboard(admin, '/admin/orders')
    const doneRow = admin.locator('tr', { hasText: customerName }).first()
    await doneRow.locator('a', { hasText: /detail/i }).click()
    await expect(admin.getByText('Selesai').first()).toBeVisible()

    await adminCtx.close()
    await finCtx.close()
    await gudCtx.close()
    await insCtx.close()
  })
})

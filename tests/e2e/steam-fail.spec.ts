import { test, expect } from '@playwright/test'
import { uid, expectToast, gotoDashboard, uploadPhoto, createProduct } from './helpers'
import path from 'path'

// BUG-133 (2026-08-15): alur Steam QC "Gagal" (revisi) — steam_jobs.status='revision'.
// Sebelumnya constraint live hanya ('pending','done') -> 23514 -> revisi macet diam-diam.
// Flow: admin buat order -> finance approve -> admin sorted+production -> gudang produksi
// selesai (order auto ke steam) -> gudang klik Revisi (+foto) -> steam_job jadi revision
// + order kembali ke production + re-queue penjahit.
//
// Catatan test-data (2026-08-15): nomor HP WAJIB unik per run — lookup customer by phone
// (dedup by design) akan meng-REUSE customer lama + menimpa nama jika HP sama, sehingga
// banyak order berbagi nama customer (locator by name jadi ambigu).
test.describe.serial('Steam QC Fail -> revisi (BUG-133)', () => {
  test('gagal QC jahitan -> steam_job revision + order kembali production', async ({ browser }) => {
    const AUTH = path.join(__dirname, '.auth')
    const customerName = `Steam Fail ${uid('C')}`
    const prodName = `Produk SF ${uid('P')}`
    const phone = `0812${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`

    // ---------- ADMIN: buat produk (harga 200k/m) + order kirim + tambah item ----------
    const adminCtx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const admin = await adminCtx.newPage()
    await createProduct(admin, prodName, `SKU-${uid('S')}`, '200000')
    await gotoDashboard(admin, '/admin/orders')
    await admin.getByRole('button', { name: /buat pesanan/i }).first().click()
    const createModal = admin.locator('.modal-panel').last()
    await createModal.locator('input[placeholder*="Ketik nama"]').fill(customerName)
    await createModal.locator('input[placeholder="08xxx"]').fill(phone)
    await createModal.locator('input[placeholder="Alamat lengkap"]').fill('Jl. Simulasi Steam Fail')
    await createModal.locator('select').nth(1).selectOption('kirim')
    await createModal.locator('input[type="number"]').nth(0).fill('500000')
    await createModal.locator('input[type="number"]').nth(1).fill('500000') // DP = total → paid
    await createModal.getByRole('button', { name: /buat pesanan/i }).click()
    await expectToast(admin, /Pesanan berhasil dibuat/i)

    // buka detail order + tangkap order id (dipakai locator unik di halaman gudang)
    const row = admin.locator('tr', { hasText: customerName }).first()
    await Promise.all([
      admin.waitForURL(/\/admin\/orders\/[0-9a-f-]+/, { timeout: 15000 }),
      row.locator('a', { hasText: /detail/i }).click()
    ])
    const orderId = admin.url().split('/').pop() ?? ''
    const orderPrefix = orderId.slice(0, 8)

    // tambah item gorden
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
    await finRow.getByRole('button', { name: /approve/i, exact: true }).click()
    await expectToast(fin, /Pembayaran diverifikasi|approved/i)

    // ---------- ADMIN: payment_ok → sorted (foto) → production (foto) ----------
    await admin.reload()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await expect(admin.getByRole('button', { name: /Lanjut: Mulai Produksi/ })).toBeVisible()
    await admin.getByRole('button', { name: /^Lanjut:/ }).first().click()
    await uploadPhoto(admin, '#progress-photo-input')
    await admin.locator('button', { hasText: /Lanjut & Simpan/ }).click()
    await expect(admin.getByRole('button', { name: /Lanjut: Submit Report/ })).toBeVisible()

    // ---------- GUDANG: produksi (assign + mulai + selesai → steam) ----------
    const gudCtx = await browser.newContext({ storageState: path.join(AUTH, 'gudang.json') })
    const gud = await gudCtx.newPage()
    await gotoDashboard(gud, '/gudang/production')
    const jobCard = gud.locator('tr', { hasText: orderPrefix }).filter({ hasText: 'Menunggu' }).first()
    // count() tidak auto-wait → tunggu row tampil dulu
    await jobCard.waitFor({ state: 'visible', timeout: 30000 })
    // tombol "Penjahit" hanya ada saat job waiting & belum di-assign; waitFor (bukan
    // count()) agar kebal race re-render realtime yang me-refresh tabel terus-menerus
    const assignBtn = jobCard.getByRole('button', { name: /penjahit/i }).first()
    const hasAssign = await assignBtn
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    if (hasAssign) {
      await assignBtn.click()
      const assignModal = gud.locator('.modal-panel').last()
      const penjahitBtn = assignModal.getByRole('button', { name: /admin penjahit/i })
      await expect(penjahitBtn).toBeVisible({ timeout: 10000 })
      await penjahitBtn.click()
      // tunggu persist sebelum reload (hindari race update vs reload)
      await expectToast(gud, /penjahit ditugaskan/i)
      await gud.reload()
    }
    const mulaiBtn = jobCard.getByRole('button', { name: /^mulai$/i }).first()
    await mulaiBtn.waitFor({ state: 'visible', timeout: 30000 })
    await mulaiBtn.click()
    const warnModal = gud.locator('.modal-panel').filter({ hasText: 'Material Tidak Mencukupi' })
    if (await warnModal.count()) {
      await warnModal.getByRole('button', { name: /tetap mulai/i }).click()
    }
    await expectToast(gud, /job produksi dimulai/i)
    await gud.reload()
    const jobRow = gud.locator('tr', { hasText: orderPrefix }).first()
    const selesaiBtn = jobRow.getByRole('button', { name: /selesai/i }).first()
    await selesaiBtn.waitFor({ state: 'visible', timeout: 30000 })
    await selesaiBtn.click()
    // PENTING: tunggu handler selesai (toast = langkah terakhir handler) SEBELUM
    // navigasi. Navigasi dini membatalkan fetch yang masih berjalan (ECONNRESET
    // di server log) → consume selesai tapi steam insert + transisi hilang.
    await expect(gud.locator('[data-sonner-toast]').filter({ hasText: /job produksi selesai/i }).first()).toBeVisible({
      timeout: 60000
    })
    // Verifikasi transisi di halaman steam (ground truth UI)
    await gotoDashboard(gud, '/gudang/steam')
    await gud.getByRole('button', { name: /qc jahitan \(steam\)/i }).click()
    const steamCard = gud
      .locator('div', { hasText: `Order #${orderPrefix}` })
      .filter({ hasText: /QC Jahitan Pass/ })
      .first()
    await steamCard.waitFor({ state: 'visible', timeout: 30000 })

    // ---------- GUDANG: STEAM FAIL → Revisi (foto wajib) ----------
    const failDialog = gud.locator('[role="dialog"]').last()
    await steamCard.getByRole('button', { name: /revisi/i }).first().click()
    await failDialog.getByPlaceholder(/Contoh: Jahitan kurang rapi/).fill('E2E BUG-133: jahitan kurang rapi, minta revisi')
    await uploadPhoto(failDialog)
    await failDialog.getByRole('button', { name: /ya, kembalikan/i }).click()
    // dialog tertutup → steam_job berstatus revision (sebelum fix: 23514, dialog tetap terbuka)
    await expect(failDialog).not.toBeVisible({ timeout: 15000 })
    await gud.reload()
    // tab reset ke laundry setelah reload → buka tab steam dulu
    await gud.getByRole('button', { name: /qc jahitan \(steam\)/i }).click()
    await expect(gud.getByText(/Dikembalikan ke Penjahit/).first()).toBeVisible({ timeout: 15000 })

    // ---------- VERIFIKASI: order kembali ke production + re-queue penjahit ----------
    await gotoDashboard(gud, '/gudang/production')
    await expect(gud.locator('tr', { hasText: orderPrefix }).filter({ hasText: 'Menunggu' }).first()).toBeVisible({
      timeout: 15000
    })

    await adminCtx.close()
    await finCtx.close()
    await gudCtx.close()
  })
})

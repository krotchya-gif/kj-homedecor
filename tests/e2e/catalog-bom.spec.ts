import { test, expect } from '@playwright/test'
import { uid, roleContext, expectToast, gotoDashboard } from './helpers'
import path from 'path'

// Simulasi: Material (owner) → Kategori + Produk (admin) → HPP/BOM (owner) → Katalog publik.
test.describe('Katalog & BOM end-to-end', () => {
  test('material → kategori → produk → HPP → tampil di katalog', async ({ browser }) => {
    const ts = uid('MAT')
    const materialName = `Kain Simulasi ${ts}`
    const catName = `Kat ${ts}`
    const catSlug = `kat-${ts.toLowerCase()}`
    const prodName = `Gorden Simulasi ${ts}`
    const prodSku = `SKU-${ts.toUpperCase()}`
    const AUTH = path.join(__dirname, '.auth')

    // ---------- OWNER: tambah material ----------
    const ownerCtx = await browser.newContext({ storageState: path.join(AUTH, 'owner.json') })
    const owner = await ownerCtx.newPage()
    await gotoDashboard(owner, '/owner/materials')
    await owner.getByRole('button', { name: /tambah/i }).first().click()
    const matModal = owner.locator('.modal-panel').last()
    await matModal.getByPlaceholder('Kain Atlas 59-1').fill(materialName)
    // Satuan default Meter (select) — biarkan
    await matModal.getByPlaceholder('0').nth(0).fill('50000') // Harga/Satuan
    await matModal.getByPlaceholder('0').nth(1).fill('100') // Stok Gudang
    await matModal.getByPlaceholder('0').nth(2).fill('20') // Stok Toko
    await matModal.getByPlaceholder('0').nth(3).fill('10') // Min. Stok
    await matModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(owner, 'Material berhasil ditambahkan')
    await expect(owner.locator('.desktop-only').getByText(materialName).first()).toBeVisible()

    // ---------- ADMIN: kategori + produk ----------
    const adminCtx = await browser.newContext({ storageState: path.join(AUTH, 'admin.json') })
    const admin = await adminCtx.newPage()
    await gotoDashboard(admin, '/admin/catalog/categories')
    await admin.getByRole('button', { name: /tambah kategori/i }).click()
    const catModal = admin.locator('.modal-panel').last()
    await catModal.getByPlaceholder('cth: Gorden', { exact: true }).fill(catName)
    await catModal.getByPlaceholder('cth: gorden', { exact: true }).fill(catSlug)
    await catModal.getByRole('button', { name: /simpan|update/i }).click()
    await expectToast(admin, 'Kategori berhasil ditambahkan')

    await gotoDashboard(admin, '/admin/catalog/products')
    await admin.getByRole('button', { name: /tambah produk/i }).click()
    const prodModal = admin.locator('.modal-panel').last()
    await prodModal.getByPlaceholder('Atlas 59-1 Smokering').fill(prodName)
    await prodModal.getByPlaceholder('SKU-001').fill(prodSku)
    // Kategori select — pilih kategori yang baru
    const catSelect = prodModal.getByLabel(/kategori/i)
    if (await catSelect.count()) {
      await catSelect.selectOption({ label: catName })
    }
    // Harga dibiarkan kosong
    await prodModal.getByRole('button', { name: /simpan/i }).click()
    await expectToast(admin, 'Produk berhasil ditambahkan')
    // Badge HPP belum dihitung
    await expect(admin.locator('.desktop-only').getByText(/HPP belum dihitung/).first()).toBeVisible()

    // ---------- OWNER: HPP + BOM ----------
    await gotoDashboard(owner, '/owner/hpp')
    await owner.getByPlaceholder('Cari produk...').fill(prodName)
    await owner.locator('div').filter({ hasText: prodName }).locator('visible=true').last().click()
    // pastikan produk terpilih (teks nama muncul)
    await expect(owner.getByText(new RegExp(prodName.replace(/-/g, '\\-'))).first()).toBeVisible()
    // Bill of Materials → Tambah
    await owner.getByRole('button', { name: /tambah/i }).last().click()
    await owner.getByRole('combobox').first().selectOption({ label: `${materialName} (meter)` })
    await owner.locator('input[type="number"]').nth(0).fill('2') // Qty BOM
    await owner.getByRole('button', { name: '+', exact: true }).click()
    // Biaya Produksi & Markup (markup default 30)
    await owner.locator('input[type="number"]').nth(1).fill('0')
    await owner.getByRole('button', { name: /simpan bom/i }).click()
    await expectToast(owner, /BOM disimpan & harga jual produk diupdate/)

    // ---------- ADMIN: verifikasi HPP + harga tampil ----------
    await gotoDashboard(admin, '/admin/catalog/products')
    await admin.getByPlaceholder('Cari produk atau SKU...').fill(prodSku)
    await expect(admin.locator('.desktop-only').getByText(/HPP:/).first()).toBeVisible()
    await expect(admin.locator('.desktop-only').getByText(prodName).first()).toBeVisible()

    // ---------- PUBLIK: katalog ----------
    const pubCtx = await browser.newContext()
    const pub = await pubCtx.newPage()
    await gotoDashboard(pub, '/catalog')
    await expect(pub.locator('.product-grid').getByText(prodName).first()).toBeVisible()

    await ownerCtx.close()
    await adminCtx.close()
    await pubCtx.close()
  })
})

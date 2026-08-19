import { test, expect } from '@playwright/test'

// Sesi 59: booking publik lewat route server POST /api/booking (rate limit 5/mnt/IP)
// + RPC create_public_booking tetap executor tunggal. Halaman publik (tanpa login) →
// test ini TIDAK memakai storageState → tidak menambah beban auth rate-limit.
//
// Order test penting: test rate-limit HARUS terakhir (menghabiskan kuota 5/mnt/IP).
// Bila dijalankan ulang dalam <60 detik, cukup tunggu 60s atau restart dev server
// (rate limiter in-memory per proses).

test.describe.serial('Booking publik (gate /api/booking sesi 59)', () => {
  test('submit valid via UI → halaman sukses', async ({ page }) => {
    await page.goto('/booking')
    await expect(page.getByRole('heading', { name: /Booking Survey & Pasang/ })).toBeVisible()

    // pilih tanggal ~5 bulan ke depan (hindari slot terbooking; pilih hari 15)
    const nextBtn = page.getByRole('button', { name: 'Next month' })
    for (let i = 0; i < 5; i++) await nextBtn.click()
    await page.locator('.booking-calendar .cal-date-btn', { hasText: '15' }).first().click()

    // pilih jam (loop beberapa slot aman dari yang mungkin terbooking)
    const slotNames = ['10:00', '11:00', '14:00', '15:00']
    let slotPicked = false
    for (const slot of slotNames) {
      await page.getByText(slot, { exact: true }).first().click()
      const val = await page.locator('input[name="time"]:checked').getAttribute('value')
      if (val === slot) {
        slotPicked = true
        break
      }
    }
    expect(slotPicked, 'tidak ada slot waktu yang bisa dipilih').toBe(true)

    // layanan Survey (Visit Toko) — tanpa alamat
    await page.locator('input[name="service_type"][value="survey"]').check()
    await page.getByLabel('Nama lengkap').fill(`E2E Booking ${Date.now().toString(36)}`)
    await page.getByLabel('Nomor WhatsApp').fill(`0812${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`)

    await page.getByRole('button', { name: /booking sekarang/i }).click()
    await expect(page.getByRole('heading', { name: 'Booking Berhasil!' })).toBeVisible({ timeout: 30000 })
  })

  test('nama kosong → 400 (validasi server route)', async ({ page }) => {
    const res = await page.request.post('/api/booking', {
      data: { phone: '081200000099', date: '2031-01-01', time: '10:00', service_type: 'survey' }
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error?.message ?? '').toMatch(/nama/i)
  })

  test('rate limit: request beruntun → 429 (anti-spam sesi 59)', async ({ page }) => {
    // 8 request cepat; yang ke-6 SELALU 429 (6+permintaan sebelumnya dalam 1 window 60s)
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await page.request.post('/api/booking', {
        data: { phone: '081200000000', date: '2031-01-02', time: '10:00', service_type: 'survey' }
      })
      statuses.push(res.status())
    }
    expect(statuses[5]).toBe(429)
  })
})
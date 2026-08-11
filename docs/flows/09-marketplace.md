# Flow 09 — Marketplace (TikTok Shop)

> Sinkronisasi pesanan dari marketplace ke sistem KJ Homedecor. **Saat ini hanya TikTok Shop yang terintegrasi penuh** (API + webhook + sync). Shopee/Tokopedia hanya sebagai **label sumber order** (`source`), belum ada integrasi otomatis.

## TikTok Shop (custom app) — TERIMPLEMENTASI ✅
1. **Pesanan masuk** — order TikTok disinkronkan otomatis ke sistem:
   - `/api/tiktok/sync-orders` → tarik order dari TikTok
   - `/api/tiktok/sync-to-main-orders` → konversi jadi order utama (order_number otomatis)
2. **Pembayaran** — status pembayaran TikTok dicerminkan:
   - `/api/tiktok/sync-finance` → sync statement → auto-create **piutang**
   - `/api/tiktok/create-piutang` → buat piutang manual dari faktur
3. **Produksi & kirim** — order TikTok mengikuti pipeline normal (Flow 01)
4. **Webhook** — `/api/tiktok/webhook` menerima event TikTok (HMAC signature; **note:** verifikasi di-skip jika `TIKTOK_APP_SECRET` tidak di-set — wajib diisi di production)
5. **OAuth** — `/api/tiktok/auth` + `reauthorize` untuk koneksi toko (kelola di `/owner/tiktok`)

## Shopee / Tokopedia — BELUM TERINTEGRASI ⚠️
- Order Shopee/Tokopedia **tidak** disinkronkan otomatis
- Admin membuat order manual dengan memilih `source = shopee / tokopedia`
- Order masuk pipeline normal (sama seperti offline)

## Catatan teknis
- Source order ditandai: `shopee | tokopedia | tiktok | offline | landing_page`
- Token TikTok tersimpan di tabel `tiktok_shop_settings` (perlu RLS diperketat — audit keamanan)
- Order dari marketplace tetap harus **lunas** sebelum dikemas/dikirim (payment gate sama)

## Menangani error sinkronisasi
- Gagal sync → dicatat & order tetap bisa diproses manual (input ulang dengan source yang sama)
- Token kedaluwarsa → `/owner/tiktok` → tombol reauthorize

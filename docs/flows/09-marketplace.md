# Flow 09 — Marketplace (TikTok Shop)

> Sinkronisasi pesanan dari marketplace ke sistem KJ Homedecor. **Saat ini hanya TikTok Shop yang terintegrasi penuh** (API + webhook + sync). Shopee/Tokopedia hanya sebagai **label sumber order** (`source`), belum ada integrasi otomatis.

## TikTok Shop (custom app) — TERIMPLEMENTASI ✅
1. **Pesanan masuk** — order TikTok disinkronkan otomatis ke sistem:
   - `/api/tiktok/sync-orders` → tarik order dari TikTok (staging di `tiktok_shop_orders`)
   - `/api/tiktok/sync-to-main-orders` → konversi order yang sudah **PAID** jadi order utama (order_number otomatis)
2. **Pembayaran** — status pembayaran TikTok dicerminkan:
   - `/api/tiktok/sync-finance` → tarik statement settlement → auto-create **piutang**
   - `/api/tiktok/create-piutang` → buat piutang manual dari settlement yang terlewat (backfill)
3. **Produksi & kirim** — order TikTok mengikuti pipeline normal (Flow 01)
4. **Webhook** — `/api/tiktok/webhook` menerima event TikTok (HMAC signature; **note:** verifikasi di-skip jika `TIKTOK_APP_SECRET` tidak di-set — wajib diisi di production)
5. **OAuth** — `/api/tiktok/auth` + `reauthorize` untuk koneksi toko (kelola di `/owner/tiktok`)

### Urutan sync yang benar
- **Admin** (halaman `/admin/tiktok`): **Sync Orders** → **Link to Main Orders** (tugas admin mengubah order TikTok jadi pesanan utama).
- **Owner** (halaman `/owner/tiktok`): sync lengkap termasuk **Sync Settlement** & **Buat Piutang** (finance juga bisa akses untuk data piutang channel).
1. **Sync Orders** — tarik order terbaru dari TikTok (belum jadi pesanan, hanya staging)
2. **Link to Main Orders** — ubah order yang sudah dibayar jadi pesanan utama (masuk pipeline)
3. **Sync Settlement** — tarik penarikan dana TikTok + catat piutang otomatis
4. **Buat Piutang** — backfill piutang untuk settlement yang terlewat (jika ada)

> Catatan pembukuan (sesi 11): revenue TikTok dicatat **saat order** (`order_created`), kas masuk E-Wallet Tiktok dicatat **saat settlement** (`piutang_received`) — tidak dobel.

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

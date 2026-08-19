# Flow 09 — Marketplace (Shopee & TikTok Shop)

> Sinkronisasi pesanan dari marketplace ke sistem KJ Homedecor. **Shopee & TikTok Shop terintegrasi penuh** (API + webhook + sync). Tokopedia hanya sebagai **label sumber order** (`source`), belum ada integrasi otomatis.

## Shopee Seller (Open Platform) — TERIMPLEMENTASI ✅ (sesi 53-56)

App `kjhomedecor` (Shopee Open Platform `239264`, `Developing` → Go Live review 24 jam, Test Partner `1241478`). Region `GLOBAL` (`partner.shopeemobile.com`, SDK `@congminh1254/shopee-sdk`), token di `shopee_shop_settings` (`SupabaseTokenStorage`).

1. **Kredensial & OAuth**
   - `POST /api/shopee/settings` → simpan `partner_id / partner_key / shop_name` (multi-shop: `shop_id` kosong = tambah toko baru)
   - `POST /api/shopee/auth/reauthorize` → buat OAuth URL (`state` nonce single-use, mirror TikTok BUG-093)
   - `GET /api/shopee/auth?code&shop_id&state` → `sdk.authenticateWithCode` → `is_active=true`, `shop_id`, `token_expires_at`. Callback URL **exact-match tanpa trailing slash**: `https://kjhomedecor.com/api/shopee/auth` (`shopeeCallbackUrl()`)
   - Setelah Go Live: Live Partner ID/Key (beda dari Test `1241478`) → ganti `shopee_shop_settings` Test → Live → Authorize Live → baru sinkronisasi jalan

2. **Pesanan masuk**
   - `POST /api/shopee/sync-orders` → `get_order_list` (cursor `more/next_cursor`, `time_range_field=update_time`, `page_size 100`) + `getOrdersDetail` batch 50 → `upsert shopee_shop_orders` (paid = `READY_TO_SHIP/PROCESSED/SHIPPED/COMPLETED`). **P0 fix 27b8f55**: `time_from/time_to` dari UI kini terpakai (sebelumnya double `req.json()` jadi `{}`). **P1 multi-shop (2026-08-19)**: upsert kini mengisi `shopee_shop_orders.shop_id` dari `settings.shop_id` (kolom + index sudah di-apply ke live).
   - `POST /api/shopee/sync-to-main-orders` → RPC `process_shopee_order_atomic` (paid → main order `orders`, `order_id_external=order_sn`, `source=shopee`) / `cancel_shopee_order_atomic` (CANCELLED → void). BLOCK on error, `sync_start_date` dijepit.

3. **Settlement (Pencairan Dana / Escrow)**
   - `POST /api/shopee/sync-escrow` → `get_escrow_list` (paginasi `page_no` loop, fix `0057df2` — sebelumnya hanya page 1) + `getEscrowDetailBatch` (commission/transaction/service/actual_shipping_fee) → `shopee_shop_orders.escrow_amount/escrow_release_time/fee` (update escrow juga mengisi `shop_id` dari `settings.shop_id`)
   - **Catat Settlement** → `process_shopee_escrow_atomic` (per order): `Dr E Wallet Shopee (1105) / Cr Piutang` + fee per kategori. Halaman: `/owner/shopee` (Owner, multi-shop + settlement per bulan), `/admin/shopee` (Admin, sync + checkbox Link), `/finance/shopee` (Finance, settlement → jurnal)

4. **Webhook**
   - `POST /api/shopee/webhook` — `SHA256 <hex(HMAC-SHA256(partner_key, rawBody))>` (`Authorization: SHA256 ...`). Body `{ code, data: string|object, shop_id, timestamp }`, `code 3 = order_status_push`, `code 4 = order_trackingno_push` → `upsert shopee_shop_orders` (mirror TikTok: tidak buat jurnal/payment tanpa user session). **Fix `0057df2`**: test push `missing/invalid signature` dibalas `200 {received:true, warning:...}` agar Console `Verify and Save` lolos; Live push dengan signature valid tetap 401 jika fake.
   - Push Mechanism: Test Call Back URL `https://kjhomedecor.com/api/shopee/webhook` → **Verified and saved successfully** (semua `Push Test Data` enabled: `order_status_push` 3, `order_trackingno_push` 4). **Live Push masih OFF** — baru aktif setelah Go Live (`Live Call Back URL`).

5. **Batas bawah sync per-shop (Wave 2)**
   - Kolom `shopee_shop_settings.sync_start_date` — semua route sync (orders/escrow + Link to Main Orders) jepit ke tanggal ini (data sebelum tanggal mulai di-skip, dianggap saldo awal). UI di `/owner/shopee` per toko.

### Urutan sync yang benar (Shopee)

- **Admin** (`/admin/shopee`): **Sync Orders** → **Link ke Main Orders** (checkbox per-order) → order Shopee jadi pesanan utama (pipeline Flow 01).
- **Owner** (`/owner/shopee`): sync lengkap termasuk **Sync Settlement (Pencairan Dana)** & per-order **Catat Settlement** → jurnal `shopee_settlement_received` (`Dr E Wallet Shopee / Cr Piutang`).
- **Finance** (`/finance/shopee`): Settlement per order → **Catat** → jurnal + `is_synced=true`.

> Catatan pembukuan: revenue Shopee dicatat **saat order** (Link to Main Orders → jurnal `shopee_sync_order_created`), kas masuk E-Wallet Shopee dicatat **saat settlement** (`shopee_escrow:*`) — tidak dobel.

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

### Urutan sync yang benar (TikTok)

- **Admin** (halaman `/admin/tiktok`): **Sync Orders** → **Link to Main Orders**.
- **Owner** (halaman `/owner/tiktok`): sync lengkap termasuk **Sync Settlement** & **Buat Piutang**.

> Catatan pembukuan (sesi 11): revenue TikTok dicatat **saat order** (`order_created`), kas masuk E-Wallet Tiktok dicatat **saat settlement** (`piutang_received`) — tidak dobel.

## Tokopedia — BELUM TERINTEGRASI ⚠️

- Order Tokopedia **tidak** disinkronkan otomatis
- Admin membuat order manual dengan memilih `source = tokopedia`
- Order masuk pipeline normal (sama seperti offline)

## Catatan teknis

- Source order ditandai: `shopee | tokopedia | tiktok | offline | landing_page`
- Token Shopee: `shopee_shop_settings` (partner_id/key, shop_id, access_token, token_expires_at, is_active, sync_start_date) — `is_active=false` sebelum Authorize Live
- Tag asal toko: `shopee_shop_orders.shop_id TEXT` + `idx_shopee_orders_shop_id` (P1 multi-shop, 2026-08-19) — diisi saat sync-orders/sync-escrow (dari `settings.shop_id`) & webhook (dari `body.shop_id`); order lama yang ter-sync sebelum kolom ada tetap NULL (tidak di-backfill)
- Token TikTok tersimpan di tabel `tiktok_shop_settings`
- Order dari marketplace tetap harus **lunas** sebelum dikemas/dikirim (payment gate sama)
- Fix P0 sesi 56: `sync-orders` date range + `sync-escrow` pagination (lebih dari 100)

## Menangani error sinkronisasi

- Gagal sync → dicatat & order tetap bisa diproses manual (input ulang dengan source yang sama)
- Token kedaluwarsa → `/owner/tiktok` atau `/owner/shopee` → tombol reauthorize (Shopee: `POST /api/shopee/auth/reauthorize`)

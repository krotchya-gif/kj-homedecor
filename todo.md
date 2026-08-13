# KJ Homedecor — Todo / Sesi Audit & Perbaikan

> **Branch:** `main` · Update terakhir: 2026-08-13 (sesi 17 — search/sort pesanan, landing theme dari DB, verifikasi SEO)

---
## ✅ Selesai (2026-08-13 — Sesi 17: Search Pesanan + Landing Theme DB + SEO)

1. ✅ **Search & sort pesanan** (`/admin/orders`):
   - Search kini server-side: **no. order (`order_number`), nama pelanggan (via `customer!inner`), tracking/resi** — bukan hanya halaman aktif
   - Filter **status** kini ke query DB (bukan client-only): `ready_to_pack` (ready+kirim), `ready_to_ship` (packed), status lain
   - **Count/pagination benar** mengikuti search+status+kategori; reset ke halaman 1 saat search/status berubah
   - Client `filtered` tetap sebagai jaring pengaman (kini termasuk `order_number`)
2. ✅ **Landing theme dari DB** (`src/app/page.tsx` — BUG-078):
   - Sebelumnya baca `data?.value` (JSON legacy basi) → semua setting admin terabaikan, landing selalu default
   - Kini **merge kolom terpisah (utama) + value JSON (fallback)** — kolom terisi menang, kolom NULL fallback ke value JSON (hero_image_url tidak hilang)
   - Terverifikasi live: tema green `#16a34a` + hero title dari DB ter-render di `/`
3. ✅ **SEO verifikasi** — `generateMetadata` (layout) & `SeoScripts` baca kolom `seo_*` key='hero' (konsisten dengan form `/admin/seo`); meta `<title>/description/og` ter-render (fallback karena data masih NULL — siap aktif saat diisi)

---
## ✅ Selesai (2026-08-13 — Sesi 16: Bersihkan Xendit + Fix Refund)

1. ✅ **Migration 080** — drop kolom legacy `payments.xendit_id`, `external_payment_method`, `xendit_payment_id` + index `idx_payments_xendit_id` (sisa migration 043, 0 data, tidak dipakai — Xendit sudah dihapus sesi 9)
2. ✅ **Fix `payments_type_check`** — live sebelumnya `('dp','lunas')` TANPA `refund` → drop + recreate `('dp','lunas','refund')`; fitur refund (insert `type:'refund'`) sebelumnya dijamin gagal 23514, kini pulih
3. ✅ Sync `000_full_schema.sql` (hapus kolom+index) + hapus `xendit_payment_id` dari `src/types/index.ts`
4. ✅ Verifikasi live: kolom xendit hilang, index hilang, constraint = dp/lunas/refund

---
## ✅ Selesai (2026-08-13 — Sesi 15: Format Tanggal + Pagination + Supplier 3 Tab)

1. ✅ **Format tanggal DD/MM/YYYY** — helper `formatDateDDMMYYYY()` di `lib/utils`; diterapkan di 16 file (finance cash, journal, piutang/faktur, hutang, lembur, surveyor, penjahit, installer, admin booking/orders, buku-besar, daftar-jurnal)
2. ✅ **Pagination semua tabel** (komponen `<Pagination>`, default 10, selector 10/20/50/100):
   - admin/reports (Source Revenue + Top Products), owner/suppliers (Suppliers + PO)
   - finance/cash, finance/cash/mutation, finance/hutang, finance/piutang/faktur
3. ✅ **Supplier → 3 tab** — halaman `/owner/suppliers` kini `🏭 Suppliers | 📋 Purchase Orders | 📈 Riwayat Harga`; isi price-history dipindah ke komponen `PriceHistoryTab`, route `owner/suppliers/price-history` dihapus + nav item dihapus (tidak ambigu lagi)
4. ✅ **Halaman `/admin/tiktok`** (lanjutan sesi 14) — menu TikTok Shop di sidebar admin (grup Operasional)

---

## ✅ Selesai (2026-08-13 — Sesi 14: TikTok Shop untuk Admin)

1. ✅ **Halaman `/admin/tiktok`** — khusus Admin: tabel order TikTok (tersync) + **2 tombol** (`Sync Orders` + `Link to Main Orders`) + date range + filter status/payment + pagination. Settlement/piutang/connect tetap di `/owner/tiktok` (Owner/Finance).
2. ✅ **Nav admin** — tambah menu "TikTok Shop" di grup Operasional.
3. ✅ Tidak perlu ubah proxy/layout (`/admin/*` sudah diizinkan admin); RLS `tiktok_shop_orders` SELECT sudah mencakup admin.
4. ✅ **Migrasi `admin/orders/[id]` ke PUT API** — DITUNDA (item besar, 6 titik `orders.update` masih bypass API) — dibahas di sesi terpisah.

---
## ✅ Selesai (2026-08-13 — Sesi 12: Fix Bug Kandidat + UI TikTok + Datepicker)

1. ✅ **BUG-069** — TikTok double-booking → **model akrual**: order path = revenue (`order_created` saja, hapus `payment_received`); settlement path = kas+beban (`piutang_received`+`ecommerce_fee`, hapus `order_created`). Revenue/kas/fee ×1
2. ✅ **BUG-070** — `sync-orders` `payment_status` dari field payment TikTok (bukan `order.status`) → order AWAITING_SHIPMENT masuk pipeline
3. ✅ **BUG-071** — steam rework macet: `gudang/production` guard steam_job `.eq('status','pending')`
4. ✅ **BUG-072** — hutang delete: tolak hapus paid/cancelled/partial
5. ✅ **BUG-073** — finance `handlePay`: rollback payment row saat jurnal gagal / update order kalah race
6. ✅ **Label tombol TikTok** — 4 tombol sync diberi sublabel + tooltip jelas (Sync Orders / Link to Main Orders / Sync Settlement / Buat Piutang)
7. ✅ **Pagination Settlement** — paginated (default 10, pilihan 10/20/50/100) + filter status (SUCCESS/PAID/COMPLETED); Orders pageSize default → 10
8. ✅ **BUG-075** — datepicker timezone: `DateRangePicker` ganti `.toISOString()` → helper local date (pilih tgl 1 jadi 31 di WIB ter-fix)

---
## ✅ Selesai (2026-08-13 — Sesi 10: Reset Data Hardening + SEO + Dead Code Audit)

1. ✅ **Migration 079** — `reset_transactional_data` di-rewrite: TRUNCATE eksplisit **41 tabel** (tidak andal CASCADE saja) + **verifikasi post-reset** (count=0 wajib, sisa → RAISE) + **guard seed** (users/accounts/account_mappings ≥ 1, reset GAGAL daripada hapus seed) + `counts_before` detail (12 kategori)
2. ✅ **`seo_settings` di-DROP** (dead sejak migration 008; SEO aktif via `landing_settings.seo_*`)
3. ✅ **BUG-068** — `layout.tsx` → `generateMetadata()` async baca `landing_settings` (key='hero') fallback hardcoded → form `/admin/seo` kini berdampak
4. ✅ **UI `/owner/settings`** — tampilkan `counts_before` dari RPC (bukti reset) + copy reset selaras (notifications/lembur/material_price_history/low_stock_alerts/production_reports/tiktok_statements) + pertegas yang dipertahankan
5. ✅ **Schema sync** — RPC reset versi baru + hapus blok seo_settings + **hapus `users.email`** (drift: tidak ada di live)
6. ✅ **Audit reset aman** — tidak ada FK dari tabel non-truncate → truncate (query `[]`); seed utuh (users 9, accounts 20, mappings 10, cash_accounts 14)
7. ✅ **Dead code terdokumentasi** (TIDAK dihapus, kecuali seo_settings): 9 route API, 5 tabel, 5 RPC, export `clientError`

---
## ✅ Selesai (2026-08-13 — Sesi 9: E Wallet Tiktok + Xendit Removal + Fix BUG-058..067)

Semua temuan sesi 8 (BUG-058 s/d BUG-067) **fixed & terverifikasi**. Detail lengkap di `bug.md`.

1. ✅ **Migration 077** — akun 1104 `Xendit Cash` → **E Wallet Tiktok** + row `cash_accounts` (saldo di-track `create_journal_atomic`) + mapping `payment_received`/`sales_return` → Kas (default offline) + BUG-061 `orders.scheduled_installation_time`
2. ✅ **Xendit dihapus** — route `create-payment` + `webhook` + env keys (tidak dipakai, keputusan owner); `payments.xendit_payment_id` tetap (legacy); BUG-063 mati bersama route
3. ✅ **BUG-058** — `createJournalEntry` panggil RPC `create_journal_atomic` langsung saat ada `supabase` server client → jurnal server-path tersimpan (verifikasi live: `admin_dp_auto`/`po_received` ada)
4. ✅ **Settlement TikTok full** — jurnal `ecommerce_fee` = fee + ongkir + adjustment (piutang selalu 0) + `piutang_received`/`payment_received` debit eksplisit **E Wallet Tiktok** (`src/config/accounts.ts`)
5. ✅ **BUG-060** — auto-DP jurnal `payment_received`; cancel hanya reverse jurnal yang benar-benar ada
6. ✅ **BUG-062** — guard transisi PO `pending→delivered→received→paid` + idempotency jurnal
7. ✅ **Schema sync** — `000_full_schema.sql` = live (suppliers.contact_person/phone/email/notes, customers.email, production_reports detail, lembur_records staff_id/jam/keterangan, inventory_movements notes/new_stock, surveys.signature_name, orders.scheduled_installation_time, akun 1104 + mapping + seed cash_accounts)
8. ✅ **BUG-059** — migration 078 RLS role-based 5 tabel inti + helper `is_staff_active_sd`/`is_installer_sd` + revoke grant anon materials/suppliers; diverifikasi user-level (penjahit insert ditolak, auto-transition tetap jalan)
9. ✅ **BUG-064/065/066/067** — QC mobile render item pending, Input Resi hanya packed, teks installer, format qty stock-opname
10. ✅ **Verifikasi** — `tsc` bersih, `npm run build` sukses, E2E: smoke 23/23 + finance 9/9 + pipeline-kirim 9/9 pass

---

## ✅ Selesai (2026-08-13 — Sesi 7: Simulasi E2E Pipeline + Fitur)

1. ✅ **Auth setup** — `tests/e2e/auth.setup.ts` login 8 role (USER.md) → storageState per role
2. ✅ **`catalog-bom.spec.ts`** — material → kategori → produk → HPP/BOM → tampil katalog publik
3. ✅ **`pipeline-kirim.spec.ts`** — 9 tahap UI: admin buat produk+order+item, finance approve, gudang produksi/steam/kemas, admin advance → Selesai
4. ✅ **`pipeline-pasang.spec.ts`** — 10 tahap: + jadwal pasang + installer checklist (foto) → Selesai
5. ✅ **`finance.spec.ts`** — kas/bank, pemasukan, pengeluaran, hutang (tambah+bayar), piutang (faktur+bayar+duplikat invoice), jurnal, laporan, rekonsiliasi, channel
6. ✅ **Smoke test** diperluas → **27/27 pass** (`npx playwright test --project=chromium`)
7. ✅ **BUG-056** — pipeline macet produksi (consume-materials sebelum update status) → diperbaiki
8. ✅ **BUG-057** — installer upload foto checklist 403 (folder evidence) → diperbaiki

---

## ✅ Selesai (2026-08-12 — Sesi 6: Backlog tersisa)

1. ✅ **`is_auto` jurnal** — diterima dari body (flag `createSimpleJournal` tersimpan, tidak hardcode false)
2. ✅ **`piutang.remaining` satu sumber** — hapus write kolom (4 tempat) → semua baca derived formula
3. ✅ **setup-accounts** — rate limit semua path, double-check race bootstrap, hapus bocor kredensial dari response
4. ✅ **Xendit webhook** — validasi amount ≤ sisa tagihan + idempotency check duluan
5. ✅ **sync-to-main-orders** — error insert order → BLOCK; helper `ensurePaymentAndJournal` + repair order existing tanpa pembukuan
6. ✅ **Jurnal webhook silent-fail** (Xendit) — jurnal gagal → 500 agar retry; retry path juga update order
7. ✅ **TikTok webhook multi-secret** — per-shop (match `shop_cipher` di DB), fallback env
8. ✅ **Dead deps** — hapus `pg`, `react-hook-form`, `@tanstack/react-query`(+devtools), `@hookform/resolvers`, `shadcn` (0 usage); pertahankan `request` (SDK TikTok)
9. ✅ **NAV_BY_ROLE sentralisasi** — `src/config/nav.tsx` (grouped + `flattenNav`); Sidebar & TopNav import sama (perbaiki drift)
10. ✅ **owner/laporan dedup** — 10 laporan jadi shared component `src/components/reports/<name>.tsx` dengan prop `variant`; finance & owner = wrapper tipis (hemat ~2300 baris)
11. ✅ **Data cleanup accounts** — migration 074: `type='income'` → `'revenue'` (4101/4102) + VALIDATE `accounts_type_check`
12. ✅ **Fitur Stock Opname UI** — `/gudang/stock-opname`: buat sesi, input hitung fisik, selisih, kirim/batalkan; nav gudang

Commit: `7b15790` (batch 1) · `c80336f` (deps+nav) · dedup laporan · `feat(stock-opname)` (batch 4)

### Lanjutan sesi 6 (stock opname approval + sync hardening)
13. ✅ **Stock Opname approval** — RPC `approve_stock_opname` (075, live): terapkan selisih ke stok + `inventory_movements` adjustment + status approved; halaman `/finance/stock-opname` + nav
14. ✅ **`sync-orders` pagination** — loop cursor (max 20 halaman); order >100 tidak terlewat
15. ✅ **GET `/api/orders`** → admin/owner/finance/gudang; **GET `/api/customers`** → admin/owner (PII)
16. ✅ **`sync-finance`** — log raw settlement diganti ringkasan (hapus data sensitif di log)
17. ✅ **`npm install`** — package-lock disinkron (deps yang dihapus tidak ada lagi)

Commit: `feat(stock-opname)` (075 + finance approve) + sync hardening

---

## ⏳ Ditunda (refactor risiko tinggi / nilai rendah — keputusan 2026-08-12)

| # | Item | Alasan defer |
|---|---|---|
| 1 | **Dual modal system** (`Modal` 36× vs `dialog` 3×) | Keduanya jalan & berfungsi. Konsolidasi = risiko regresi UI (steam QC, logout) untuk nilai 0. `dialog` (base-ui) dipakai utk konfirmasi terstruktur, `Modal` utk ringan. |
| 2 | **File monolitik** `admin/orders/[id]` (3.601 baris) dkk | Refactor besar pada jalur kritis order pipeline — risiko regresi tinggi, tidak untuk dikerjakan di akhir sesi. Perlu pengerjaan tersendiri (ekstrak komponen bertahap). |

---

## ✅ Selesai (2026-08-12 — Sesi 5: Tests, Role Check POST, Upload, Docs)

1. ✅ **Tests suite (Vitest)** — `tests/unit/orders.test.ts` (state machine `orders.ts`: pipeline kirim/pasang, getNextStage, foto wajib, label) + `tests/unit/lib-helpers.test.ts` (`getClientIp` anti-spoof, `signTikTokRequest` HMAC) → **16 test pass** (`npm run test:run`)
2. ✅ **Route POST role check** (login-only → role-gated, defense-in-depth; semua API ini tidak dipanggil UI — CRUD via direct supabase yang sudah role-gated page):
   - `customers`, `materials`, `products`, `suppliers`, `install-bookings`, `orders` POST → `admin/owner`
   - `purchase-requests` POST → `gudang/admin/owner`
3. ✅ **`/api/upload`** — service client pindah ke dalam handler (setelah auth) + **scope folder per role** (`videos`/`documents` → admin/owner/finance; survey → surveyor; qc/order_progress → gudang; dst.) — cegah abuse upload video 100MB
4. ✅ **Docs sync**: README (migration 71 → 3 file, security note, tanggal); `docs/flows/10-staff-akses.md` (admin kelola staff, laundry punya dashboard, catatan keamanan); `audit-finance.md` (F-35/F-72 = false positive → rujuk BUG-020; catatan akses finance marketplace = SUDAH dieksekusi proxy.ts:81-87)
5. ✅ **Server-side price validation — DIINVESTIGASI, tidak applicable**: pembuatan order via halaman admin (role-gated `/admin`), API `/api/orders` POST tidak dipanggil UI & kini di-gate admin/owner. Recompute dari `order_items` tidak feasible karena API POST tidak menerima items. Risiko manipulasi harga ditutup oleh role gating.

---

## ✅ Selesai (2026-08-12 — Sesi 4: Security API)

1. ✅ **Fail-open DELETE order** (`?? 'admin'`) → deny (profil tak ada / non-admin-owner → 403)
2. ✅ **`consume-materials`** + role check gudang/admin/owner (RPC SECURITY DEFINER tidak bisa disalahgunakan)
3. ✅ **Surveys fail-open** → role `?? null` + deny; POST & GET dibatasi surveyor/admin/owner
4. ✅ **install-bookings PUT whitelist** field (anti mass-assignment) + `actual_date` kini tersimpan (sebelumnya di-drop → laporan installer kosong)
5. ✅ **po-delivery GET** + auth & role gudang/admin/owner
6. ✅ **journal GET** dibatasi finance/admin/owner (data debit/kredit tidak bocor)
7. ✅ **TikTok webhook** signature timing-safe (tiru xendit)
8. ✅ **TikTok OAuth callback** — hapus gate `getUser()` service client (selalu null → selalu 401 → koneksi TikTok tidak pernah selesai)
9. ✅ **Rate limit IP** — helper `getClientIp()` anti-spoof (x-forwarded-for[0] → x-real-ip)
- Commit `4277557` · typecheck bersih

---

## ✅ Selesai (2026-08-12 — Sesi 3: Schema↔Live Sync, RLS Hardening, TikTok Fee)

### 🗄️ 000_full_schema.sql = kondisi live final
1. ✅ 58 tabel = 58 tabel live; 58/58 ENABLE RLS; policy nama = kondisi live (diverifikasi via `pg_policies` + simulasi eksekusi file)
2. ✅ Migration 072 (commit `5cd8d45`): kolom drift (`order_date`, `shipping_address`, `actual_date`, `piutang.description`, `accounts.normal_side`, `hutang.remaining`, `landing_settings.key`, `survey_logs.user_id`) + `order_logs_action_check` + `payment_verified`
3. ✅ **RLS hardening 067/071 akhirnya efektif** — DROP policy lama pakai nama yang BENAR (sebelumnya no-op: "Authenticated staff (full) access" vs asli tanpa kurung):
   - `users`: "Authenticated staff full access" (FOR ALL) dihapus → hanya `All staff read` + `Admin manage`
   - `tiktok_shop_settings/orders/statements`: permissive dihapus + ENABLE RLS + manage mencakup **finance** (route sync TikTok mengizinkan finance + token refresh user client)
   - `accounts/account_mappings/hutang/piutang/cash_accounts`: permissive dihapus → `All staff read` + `Finance can manage`
4. ✅ survey_logs RLS + policy pakai helper standar `is_admin_or_owner_sd()`; fungsi legacy `is_admin_or_owner()` di-drop
5. ✅ 4 tabel legacy live ditambahkan ke schema (packing_checklists, return_requests, seo_settings, order_preparation_checklist)

### 🧾 TikTok Settlement — Fee terjurnal penuh (tidak main net)
6. ✅ Migration 073: kolom breakdown (`revenue_amount`, `fee_amount`, `shipping_cost_amount`, `net_sales_amount`, `adjustment_amount`) + `piutang.fee_amount` + unique index `piutang_tiktok_invoice_unique`
7. ✅ **Mapping BENAR** (terverifikasi payload live): `settlement_amount` = GROSS (pembayaran customer), `revenue_amount` = NET (masuk bank), `fee_amount` = biaya platform
8. ✅ Piutang settlement dicatat **gross** + **3 jurnal** (`order_created` → `ecommerce_fee` → `piutang_received`) semua ber-idempotency key → **anti-double** (statement `piutang_id IS NULL` + duplikat invoice + unique index DB + idempotency jurnal)
9. ✅ Webhook TikTok **stop auto-piutang** (payload tanpa breakdown) — statement webhook ikut terjurnal saat Sync Finance berikutnya
10. ✅ `create-piutang` terima **date range**; Sync Finance menyapu statement existing tanpa piutang (opsi 2)
11. ✅ UI owner/tiktok: kolom Revenue (gross) | Fee | Settlement (bank) + stat Total Fee; formula sisa piutang kurangi `fee_amount` di faktur/process/umur-piutang/rekonsiliasi/channel/settings/payments/dashboard

---

## ✅ Selesai (2026-08-12 — Sesi 2: Sinkronisasi Final & Klarifikasi)

1. ✅ `000_full_schema.sql` (1426 → 2115 baris) = satu-satunya referensi schema, sudah = kondisi live (migration 053-071, Section 10) — commit `4c73ab5`
2. ✅ Verifikasi live (REST service role): semua kolom/tabel/RPC yang dipakai codebase ADA (`create_journal_atomic`, `reset_transactional_data`, `is_finance_role`, `is_admin_or_owner_sd`, `generate_survey_number`, dll); `exec_sql` mati (404)
3. ✅ Komentar migration 058 dikoreksi — 4 fungsi klaim audit (`process_return_refund`, `create_journal_entry`, `approve_stock_opname`, `record_material_consumption`) ternyata:
   - **Tidak ada di DB live** (404) & tidak dipakai `src/`
   - 3/4 fungsionalitasnya ada dengan nama beda: refund → client-side `handleRefund`; jurnal → `create_journal_atomic` (via `utils/journal/create.ts`); konsumsi material → `consume_materials_for_production`
   - 1/4 (`approve_stock_opname` / fitur stock opname UI) **belum pernah diimplementasi** — tabel `stock_opname_sessions/items` ada tapi tanpa halaman/kode pengguna
   - Commit `9fc4f59`
4. ✅ Login semua role 200 (owner/admin/gudang/finance/penjahit/installer/surveyor/laundry) — recursion RLS users fixed (071)

---

## ✅ Selesai (2026-08-12 — Sesi 1: Finance Hardening, Fitur Baru & Laundry)

### 🛡️ Security & RLS (BUG-019/021/031/032)
1. ✅ Role check di API: create-staff, purchase-orders, po-delivery, seo-upload, surveys/[id], TikTok auth/sync/reauthorize, purchase-requests/[id] (whitelist), install-bookings/[id]
2. ✅ Fail-open `?? 'admin'` dihapus (proxy + orders API) → deny
3. ✅ Redaksi `error.message` SEMUA route API (`lib/api-errors.ts` toClientError)
4. ✅ Migration 067: RLS role-based (laundry_payroll/rates, style_rates, assets, account_categories, users, payments/journal cleanup, policy TikTok), role check + revoke 5 RPC stock/pipeline
5. ✅ Migration 070: `users_role_check` + role laundry

### 🧾 Pembukuan & Akurasi (BUG-009 s/d 012, 022, 025, 027, 029, 030, 034)
6. ✅ Jurnal atomik `create_journal_atomic` (entry+lines+saldo kas 1 transaksi + idempotency_key) — migration 064/066
7. ✅ DP jujur (F-2): tidak isi lunas fiktif; order tanpa bayar diblokir advance
8. ✅ Settings saldo awal tanpa double-count (F-6); Xendit remaining benar (F-7); PO paid → `hutang_paid` (F-8)
9. ✅ Refund → `sales_return` (Dr Penjualan Retur/Cr Kas) + retur piutang berjurnal (F-9/F-14)
10. ✅ Idempotency stabil per submit + guard optimistic + rollback (F-10/F-11)
11. ✅ TikTok: order + payment + jurnal; settlement berjurnal; cancel sinkron + reversal (F-13/14)
12. ✅ Rekonsiliasi F-61: sumber utama piutang = tabel `piutang` + halaman `/finance/rekonsiliasi` (read-only)

### 🚚 Pipeline & Booking (BUG-007, 026, 028)
13. ✅ Satu jalur booking → order (RPC cascade) + role check installer (F-18)
14. ✅ Payment gate packing (gudang/qc + admin/shipping) + guard regresi status (F-16/17)
15. ✅ Gudang production selesai → auto-create steam_job

### 🧺 Fitur Baru
16. ✅ **Reset Data** (owner only): migration 068 RPC + `/owner/settings` double-confirm ketik RESET
17. ✅ **Faktur & Surat Jalan**: `generateFakturPDF` (KJ-FAKTUR-*) & `generateSuratJalanPDF` (KJ-SURATJALAN-*) + tombol di order detail
18. ✅ **Flow Laundry**: dashboard `/laundry` (terima task + lapor selesai kg_actual) — migration 069; payroll pakai `kg_actual`; akun `laundry@kjhomedecor.com`
19. ✅ Guard edit/hapus faktur piutang yang sudah dibayar

---

## ✅ Selesai (2026-08-11 — Sesi Pipeline, Payment & Katalog)

### 🔄 Pipeline Order — tidak macet lagi
1. ✅ **BUG-001** Steam QC Pass → order **otomatis** jadi `Siap` (`gudang/steam`)
2. ✅ **BUG-002** Tombol **"Kemas"** di `gudang/qc` (Siap → Dikemas) — gudang tanpa akses /admin
3. ✅ **BUG-003** Admin = escape hatch semua stage (align API) — 🔒 hilang
4. ✅ **BUG-004** DP admin **auto-catat** ke tabel `payments`; approve finance = verifikasi final; aturan cek bayar terakhir
5. ✅ **BUG-007** Modal **"Jadwalkan Pasang"** di order detail (tanggal + installer) → auto-create/update `install_bookings` — koneksi ke installer pulih
6. ✅ Prefill foto bukti di modal advance (tidak upload ulang)

### 🏷️ Harga Produk (BUG-008)
7. ✅ Harga jual **bukan tanggung jawab admin** — di-set Owner via `/owner/hpp`
8. ✅ Badge status HPP di list produk admin (🟠 belum dihitung / ✅ HPP)
9. ✅ Katalog publik & landing filter `price > 0`; detail produk fallback "Harga: Hubungi via WhatsApp"
10. ✅ Import CSV produk: price tidak wajib

### 📚 Dokumentasi
11. ✅ `pendoman.md` — panduan penggunaan per role (bahasa sederhana)
12. ✅ `bug.md` — tracker bug (BUG-001 s/d BUG-008)
13. ✅ `docs/flows/` 01-10 — disinkronkan dengan kode aktual
14. ✅ `README.md`, `USER.md`, `todo.md` — diperbarui

---

## ✅ Selesai (2026-07-18 — Sesi Audit)

- `middleware.ts` → `proxy.ts` (Next.js 16) + prefix matching
- Auth helpers (`src/lib/auth.ts`): `requireAuth`, `requireRole`, `requireAuthRole`, `checkRateLimit`
- Setup endpoint proteksi, mass assignment, IDOR, upload validation
- Recharts polish (gradient, animasi, donut) di 3 dashboard
- Migrations RLS 053-058, `.env.example`

---

## ⏳ Belum Selesai (prioritas berikutnya)

> Item yang SUDAH dikerjakan (sesi 3-6) sudah dihapus dari daftar — tidak perlu di-fix ulang.

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **Smoke test E2E di browser** | 🟠 **High** | ✅ `tests/e2e/smoke.spec.ts` — **15/15 pass**: login 8 role (redirect dashboard), security (penjahit → proxy redirect + API 403), halaman kunci (admin/orders, stock-opname gudang+finance, owner/settings, rekonsiliasi). Jalankan: `npx playwright test --project=chromium` |
| 2 | **Monolitik `admin/orders/[id]` pecah** | 🟡 Medium | Tahap 1 (logika murni → `lib/order-detail.ts` + test) ✅ + Tahap 2a (`OrderActivityLog`) ✅ selesai. **Sisa:** pipeline stepper, info blocks, items table, checklist, survey, 5 modal aksi, AddItem form (±2.400 baris) — ekstrak bertahap |
| 3 | **Duplikasi kecil** | 🟢 Low | `formatRp` ✅ (42 file → import `lib/utils`). `STATUS_COLORS`/`LooseRow` sengaja dipertahankan (bukan duplikasi identik — 3 skema beda / method-call) |
| 4 | **Unique `invoice_number` piutang non-tiktok** | 🟢 Low | ✅ migration 076 + cek duplikat di faktur page |

---

## 📋 Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```

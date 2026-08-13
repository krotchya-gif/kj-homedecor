# Riwayat Perbaikan & Bug — KJ Homedecor

> Satu dokumen konsolidasi: **riwayat perbaikan per fase** + **tracker bug lengkap (BUG-001 s/d BUG-115)** + **audit modul finance** + **backlog**.
> File ini menggabungkan `bug.md`, `todo.md`, `audit-finance.md`, dan bagian "Riwayat Perbaikan" README (dikonsolidasi 2026-08-13, sesi 37).
>
> Cara pakai: cari bug berdasarkan ID (tabel di bawah) → status & cara fix langsung terlihat di kolom "Cara Fix". Untuk konteks fase, lihat "Riwayat Perbaikan per Fase". Untuk temuan audit finance, lihat bagian "Audit Modul Finance".

---

## 1. Riwayat Perbaikan per Fase

### 2026-08-13 — Sesi 38: Sync schema = live + fix laundry order_id (migration 088)
- **BUG-116**: tambah kolom `laundry_orders.order_id` di live (dipakai codebase tapi tidak ada → insert laundry dari order detail gagal 42703); sync `000_full_schema.sql` = live untuk 5 tabel (`laundry_orders`, `landing_settings`, `material_price_history`, `assets`, `order_progress_photos`) — kolom legacy live & kolom yang dipakai codebase (`landing_settings.value`, `material_price_history.created_at`) kini tercatat di schema. **Verifikasi user-level**: INSERT laundry + order_id sukses; tsc + build + vitest 27/27.

### 2026-08-13 — Sesi 37: Audit menyeluruh + migration 087 (hardening)
- Hardening RLS katalog/BOM/users (write → admin/owner, SELECT staff aktif); `REVOKE anon` helper `is_finance_role` & `rls_auto_enable`; cleanup duplikat `cash_accounts` (19 baris Kas → 1); drop 7 index tak terpakai + tambah 15 index FK hot; `order_totals` → security_invoker; `SET search_path` 3 fungsi. **Verifikasi user-level**: penjahit INSERT ditolak 42501, admin sukses.

### 2026-08-13 — Sesi 36: Rapi & manual book final
- `scroll-behavior: smooth` dipindah ke layout; `pendoman.md` ditulis ulang jadi manual book (13 bab + 15 FAQ); `USER.md` & `docs/flows/README.md` jadi referensi manual book.

### 2026-08-13 — Sesi 35: Phase 6F — Dead code cleanup final
- Hapus 8 route API tanpa caller produksi + `clientError`; drop 3 tabel dead (`packing_checklists`, `return_requests`, `order_preparation_checklist`) + 4 RPC dead; update `reset_transactional_data` (migration 086). **Dipertahankan**: `low_stock_alerts`/`order_material_consumption` (RPC produksi) & `rls_auto_enable` (event trigger ensure_rls).

### 2026-08-13 — Phase 6B: Refactor monolit `admin/orders/[id]` (Sesi 29–33)
- **6B-1 (Sesi 29):** `LOG_ACTION` map & `DEFAULT_CHECKLIST` → `lib/order-detail.ts` (`getOrderLogAction`), unit test +3 (27 total).
- **6B-2 (Sesi 30):** ekstrak 5 modal → `components/orders/` (Schedule, Photo, Cancel, Return, Payment). Page 3.561 → 2.923 baris.
- **6B-3/3d (Sesi 31–32):** ekstrak `OrderPipelineStepper`, `OrderSurveySection`, `OrderSummarySection`, `OrderItemsTable`, `PreparationChecklist`, `AddItemModal`. Page → 1.490 baris.
- **6B-4 (Sesi 33):** semua state & handlers → `useOrderDetail(id)` hook; page jadi komposisi murni **505 baris** (−85%). Verifikasi browser 10/10.

### 2026-08-13 — Phase 6A/C/D: dead SDK, dedup nav, notifikasi realtime (Sesi 26–28)
- **6A:** hapus `src/lib/tiktok-shop-sdk/` (1.971 file, 0 import) + deps `request`/`@types/request`; integrasi tetap via `lib/tiktok.ts`.
- **6C:** shared `components/reports/ReportsNav.tsx` (dedup nav laporan finance/owner).
- **6D:** migration 085 aktifkan Realtime `notifications`; `NotificationBell` polling 30s → `postgres_changes`.

### 2026-08-13 — Phase 5: UI cepat (Sesi 24)
- Pagination admin/portfolio & admin/laundry; `theme_preset` → `custom` saat warna diedit; `handleSave` landing deteksi 0-rows; kredensial default dihapus dari setup; teks korup installer diperbaiki.

### 2026-08-13 — Phase 4: Akurasi laporan (Sesi 23)
- "Kronologi HPP" → **"Kronologi Omzet"** (nama jujur) + pagination server-side; akhir bulan dinamis (fix bulan 30 hari); helper `piutangSisa()` satu sumber kebenaran; admin/reports filter periode ke server (tanpa `.limit(200)`).

### 2026-08-13 — Phase 3: Integritas akuntansi (Sesi 22)
- Rollback jurnal diseragamkan pola BUG-073 di semua jalur (refund/hutang/piutang/payroll/aset); hardcoded UUID akun → helper `getAccountIdByCode`; `accounts/accounts` pakai `fetchAccountBalances` (hapus double-count); PO paid di owner/suppliers → jurnal `hutang_paid` idempotent; `markAsPaid` payroll + idempotency_key.

### 2026-08-13 — Phase 2: Hardening API (Sesi 21)
- Rate limit 9 route sensitif; `create-staff` (status active, password min 8, anti-enumeration, role laundry); TikTok OAuth `state` → random nonce single-use (migration 084).

### 2026-08-13 — Phase 1: Keamanan PII & fail-closed (Sesi 20)
- GET `orders/[id]`, `install-bookings` (+[id]), `materials`, `suppliers`, `purchase-*` di-role-gate server-side; cek `status='active'`; fail-open `role ?? 'admin'` → fail-closed. Tambah SOP Bug-Fix di `AGENTS.md`.

### 2026-08-13 — Sesi 19: Landing settings & SEO + Laundry + Owner/Staff
- RLS `landing_settings` admin/owner-only (migration 083); sitemap & robots disimpan di DB + route publik baca dari DB; trust badges tampil; preset `modern` hex; 5 field tanpa UI dihapus. Fix `laundry_orders_status_check` (migration 082 — task laundry bisa diterima); payroll toast jelas (paid = final). `/owner/staff` — kolom Email dihapus, urutan role rapi.

### 2026-08-13 — Sesi 18: Full E2E suite per role
- 10 spec E2E (laundry, surveyor, penjahit, HPP/BOM, shipping-resi, finance-payments, gudang, admin-ops, owner, finance-ext) + baseline 5 spec — render semua halaman kunci pass.

### 2026-08-13 — Sesi 17: Search pesanan + landing theme DB + SEO
- Search & sort pesanan server-side (RPC `search_orders`, migration 081); BUG-078 landing theme/konten dari DB (merge kolom + value JSON); SEO meta dari DB (`generateMetadata`).

### 2026-08-13 — Sesi 16: Bersihkan Xendit + fix refund
- Migration 080 drop kolom legacy `payments.xendit_*` + index; fix `payments_type_check` tambah `'refund'` (sebelumnya insert refund dijamin gagal 23514).

### 2026-08-13 — Sesi 15: Format tanggal + pagination + supplier 3 tab
- Helper `formatDateDDMMYYYY()` di 16 file; pagination semua tabel (komponen `<Pagination>`); `/owner/suppliers` → 3 tab (Suppliers | Purchase Orders | Riwayat Harga), route price-history dihapus.

### 2026-08-13 — Sesi 14: TikTok Shop untuk Admin
- Halaman `/admin/tiktok` (tabel order tersync + 2 tombol + filter + pagination); nav admin grup Operasional; migrasi order detail ke PUT API ditunda (item besar).

### 2026-08-13 — Sesi 12: Fix bug kandidat + UI TikTok + datepicker
- BUG-069 TikTok double-booking → model akrual (revenue ×1, kas ×1, fee ×1); BUG-070 payment_status dari field payment; BUG-071 steam rework; BUG-072 hutang delete guard; BUG-073 finance pay rollback; label tombol TikTok; pagination settlement; BUG-075 datepicker timezone.

### 2026-08-13 — Sesi 10: Reset data hardening + SEO + dead code audit
- Migration 079 rewrite `reset_transactional_data` (TRUNCATE 41 tabel + verifikasi + guard seed); `seo_settings` di-drop; BUG-068 `generateMetadata` async baca DB; UI `/owner/settings` tampilkan counts; schema sync; dead code terdokumentasi.

### 2026-08-13 — Sesi 9: E Wallet Tiktok + Xendit removal + fix BUG-058..067
- Migration 077 akun 1104 `Xendit Cash` → `E Wallet Tiktok`; Xendit dihapus (route + env); BUG-058 jurnal server-path via RPC langsung; settlement TikTok full (fee+ongkir+adjustment terjurnal); BUG-060 auto-DP jurnal; BUG-062 guard transisi PO; BUG-059 migration 078 RLS role-based 5 tabel inti + revoke anon; BUG-064/065/066/067 fix UI.

### 2026-08-13 — Sesi 7: Simulasi E2E pipeline + fitur
- Auth setup 8 role → storageState; spec `catalog-bom`, `pipeline-kirim` (9 tahap), `pipeline-pasang` (10 tahap), `finance`; smoke → 27/27 pass; BUG-056 pipeline produksi macet; BUG-057 installer upload foto 403.

### 2026-08-12 — Sesi 6: Backlog tersisa
- `is_auto` jurnal; `piutang.remaining` satu sumber; setup-accounts rate limit + anti-race; Xendit webhook validasi; sync-to-main-orders error → BLOCK; jurnal webhook silent-fail → 500; TikTok webhook multi-secret; deps mati dihapus; `NAV_BY_ROLE` sentralisasi (`config/nav.tsx`); owner/laporan dedup (shared component, hemat ~2.300 baris); `type='income'` → `'revenue'` (migration 074); fitur Stock Opname UI; RPC `approve_stock_opname` (075); sync-orders pagination; GET `/api/orders` & `/api/customers` role-gate; sync-finance log sensitif dipangkas.

### 2026-08-12 — Sesi 5: Tests, role check POST, upload, docs
- Vitest suite (16 test): state machine orders + `getClientIp`/`signTikTokRequest`; route POST role-gate (customers/materials/products/suppliers/install-bookings/orders → admin/owner; purchase-requests → gudang/admin/owner); `/api/upload` scope folder per role; docs sync.

### 2026-08-12 — Sesi 4: Security API
- Fail-open DELETE order → deny; `consume-materials` + role check; surveys fail-open → deny; install-bookings PUT whitelist field + `actual_date` tersimpan; po-delivery GET + auth; journal GET dibatasi finance/admin/owner; TikTok webhook timing-safe; OAuth callback hapus gate `getUser()`; rate limit `getClientIp()` anti-spoof.

### 2026-08-12 — Sesi 3: Schema↔live sync, RLS hardening, TikTok fee
- `000_full_schema.sql` = kondisi live (58 tabel, 58 RLS, policy nama = live); migration 072 kolom drift + `order_logs_action_check`; RLS hardening 067/071 akhirnya efektif (DROP policy nama benar); survey_logs RLS; migration 073 breakdown fee + mapping BENAR (`settlement_amount`=gross, `revenue_amount`=net) + 3 jurnal idempotent + anti-double; webhook stop auto-piutang; UI owner/tiktok kolom Revenue/Fee/Settlement.

### 2026-08-12 — Sesi 2: Sinkronisasi final & klarifikasi
- `000_full_schema.sql` (1.426 → 2.115 baris) = satu-satunya referensi schema = live; verifikasi live semua kolom/tabel/RPC; koreksi klaim 4 fungsi audit (tidak ada di live / nama beda / belum diimplementasi); login semua role 200 (recursion users fixed).

### 2026-08-12 — Sesi 1: Finance hardening, fitur baru & laundry
- Role check API; fail-open dihapus; redaksi error (toClientError); migration 067 RLS role-based + revoke 5 RPC; migration 070 `users_role_check` + laundry; jurnal atomik `create_journal_atomic` (064/066); DP jujur; refund → `sales_return`; TikTok order+payment+jurnal; rekonsiliasi sumber piutang = tabel `piutang`; satu jalur booking → order; payment gate packing; auto-create steam_job; **Reset Data** (owner, double-confirm); **Faktur & Surat Jalan PDF**; **Flow Laundry** (`/laundry` + payroll kg_actual).

### 2026-08-11 — Pipeline, Payment & Katalog
- BUG-001/002/003/007: Steam Pass auto-advance ke Siap; tombol Kemas di gudang; admin escape hatch; prefill foto; modal Jadwalkan Pasang + auto-create booking. BUG-004: DP admin auto-catat ke `payments`; approve finance = verifikasi final. BUG-008: harga jual bukan tanggung jawab admin — di-set Owner via HPP; produk tanpa harga tersembunyi dari katalog. Docs: `pendoman.md`, `bug.md`, `docs/flows/` disinkronkan.

### 2026-07-18 — Audit & proxy migration
- `middleware.ts` → `proxy.ts`; auth helpers (`requireAuth`, `requireRole`, `requireAuthRole`, `checkRateLimit`); setup proteksi, mass assignment, IDOR, upload validation; migrations RLS 053-058.

### 2026-06-02 — Pipeline V2
- `payment_ok` di depan, steam revision loop, 3 QC distinct.

---

## 2. Status Bug — Tabel Lengkap (BUG-001 s/d BUG-115)

> Semua bug sudah **Fixed** kecuali BUG-020 (bukan bug — false positive). Bagian detail Gejala/Akar per bug sudah diringkas ke kolom "Cara Fix".

| ID | Bug | Status | Cara Fix |
|---|---|---|---|
| BUG-001 | Pipeline macet di Steam/QC — gudang tidak bisa advance | ✅ Fixed | Steam Pass auto-update `orders.status='ready'` (guard idempoten) |
| BUG-002 | Pipeline macet di Kemas (ready → packed) — gudang tidak bisa advance | ✅ Fixed | Tombol "Kemas" di `/gudang/qc` per order ready |
| BUG-003 | Role admin diblokir di stage production/steam/ready | ✅ Fixed | Admin = escape hatch semua stage (align API) |
| BUG-004 | Approve pembayaran (Cek Bayar) gagal jika DP diinput admin | ✅ Fixed (Opsi B) | DP admin auto-catat ke tabel `payments`; approve finance = verifikasi final |
| BUG-005 | Role drift: TS `Role` vs DB CHECK constraint vs pemakaian app | ✅ Fixed | Tambah `'surveyor'` ke TS Role type; seragam 8 role |
| BUG-006 | `x-pathname` header diklaim tapi tidak pernah di-set | ✅ Fixed | `proxy.ts` set header |
| BUG-007 | Pipeline pasang: booking installer tidak terhubung dari order detail | ✅ Fixed | Modal "Jadwalkan Pasang" + auto-create/update `install_bookings` |
| BUG-008 | Harga jual produk diinput admin (tebakan) padahal belum tahu HPP | ✅ Fixed (Opsi A) | Harga jual = tanggung jawab Owner via HPP; produk tanpa harga tersembunyi dari katalog |
| BUG-009 | **Pembukuan server mati**: `createJournalEntry` pakai URL relatif → jurnal order/PO tak pernah dibuat | ✅ Fixed | `createJournalEntry` terima `baseUrl`; pemanggil server meneruskan base URL |
| BUG-010 | **Tanda saldo terbalik** di laporan keuangan (normal_side NULL) | ✅ Fixed | Hitung tanda dari `a.type` (asset/expense debit, liability/equity/revenue credit) |
| BUG-011 | **PO received jurnal pakai QUANTITY** sebagai nominal | ✅ Fixed | Jurnal `purchase` pakai `actual_cost` (nominal rupiah), qty hanya untuk stock |
| BUG-012 | Refund rusak 3 lapis (tanpa jurnal, dead policy, refund dobel) | ✅ Fixed | Jurnal refund + kurangi dp/lunas + policy returns diperbaiki + guard idempotency |
| BUG-013 | Hutang & piutang off-ledger (bayar/buat tak pernah bikin jurnal) | ✅ Fixed | Helper transaksional + auto-jurnal faktur |
| BUG-014 | `piutang.paid_amount/return_amount` tak pernah di-write → tak bisa lunas | ✅ Fixed | Aksi bayar per faktur (jurnal) + handler retur + konsolidasi `remaining` |
| BUG-015 | Filter periode DEAD di 8/10 laporan (`useEffect([])`) | ✅ Fixed | `useEffect(..., [startDate, endDate])` + aging dari due_date |
| BUG-016 | Neraca tidak balance (tanpa laba berjalan) | ✅ Fixed | Tambah baris "Laba Berjalan" di ekuitas |
| BUG-017 | Komisi marketplace TikTok hilang (`commission_fee: 0` hardcode) | ✅ Fixed | Breakdown komisi/beban platform + auto-jurnal settlement 3 langkah |
| BUG-018 | `exec_sql` backdoor (SECURITY DEFINER) di DB | ✅ Fixed (migration 063) | Drop/revoke — terverifikasi mati 404 di live |
| BUG-019 | RLS tabel keuangan `FOR ALL authenticated` + journal tanpa role check | ✅ Fixed | RLS role-based + role check + zod + REVOKE RPC |
| BUG-020 | **FALSE POSITIVE (verified)**: F-35/F-72 "NUMERIC string concat" | ❌ Bukan bug | PostgREST NUMERIC = `number` di runtime; `+` = aritmetika |
| BUG-021 | **Security API**: create-staff fail-open, PO no-auth, upload MIME spoofable, dll | ✅ Fixed | Role gate + validasi + redaksi error |
| BUG-022 | **Pembukuan bocor**: payment admin & Xendit & faktur & payroll & aset & saldo awal tanpa jurnal | ✅ Fixed | Jurnal di semua jalur + jurnal pembuka saldo awal |
| BUG-023 | **UI finance**: handleQcApprove dead, refund tab salah, kas tanpa validasi, transfer race, dll | ✅ Fixed | Fix per item (BUG-025 rinci) |
| BUG-024 | **Drift**: Role type tanpa surveyor, x-pathname, proxy map, sidebar, finance akses marketplace | ✅ Fixed | Seragamkan; proxy whitelist finance ke `/owner/marketplace` & `/owner/tiktok` |
| BUG-025 | **Sisa audit F-31..F-71** (dua kolom sumber, statistik halaman-aktif, buku besar, kas tidak live, dll) | ✅ Fixed (migration 064) | RPC `create_journal_atomic` (entry+lines+saldo kas SATU transaksi + idempotency) |
| BUG-026 | **F-18 booking installer tidak cascade ke orders** | ✅ Fixed | Semua status booking lewat 1 jalur (API → RPC `advance_install_booking_status`) + role check |
| BUG-027 | **F-2 DP order = `paid` palsu + gate tanpa-DP** | ✅ Fixed | DP tidak isi `lunas_amount` fiktif; order `pending` diblokir advance (UI+API, kecuali finance) |
| BUG-028 | **F-16/F-17 pipeline gate bocor** (packing tanpa cek lunas, regresi status) | ✅ Fixed | Gate `paid` di gudang/qc & admin/shipping; guard `.eq('status')`; auto-create steam_job |
| BUG-029 | **F-13/14 e-commerce off-ledger** (TikTok paid tanpa payment/jurnal) | ✅ Fixed | sync-to-main-orders + payment + jurnal idempotent; cancel reversal |
| BUG-030 | **F-9 refund menciptakan piutang** (Dr Piutang/Cr Kas) | ✅ Fixed | Mapping `sales_return` (Dr Penjualan Retur/Cr Kas) + retur piutang berjurnal |
| BUG-031 | **Security API lanjutan**: TikTok auth/sync tanpa role check, mass-assignment, users write bebas | ✅ Fixed | Role check TikTok/PR/staff; redaksi error 26 route; deny |
| BUG-032 | **RLS & RPC hardening**: policy permisif + RPC stock tanpa role check | ✅ Fixed (migration 067) | RLS role-based + REVOKE PUBLIC/anon + role check 5 RPC |
| BUG-033 | **`users_role_check` hilang role laundry** → insert laundry gagal 23514 | ✅ Fixed (migration 070) | Drop + recreate constraint lengkap |
| BUG-034 | **F-61 sumber piutang ganda** (orders vs tabel piutang) | ✅ Fixed | Sumber utama = tabel `piutang` + halaman rekonsiliasi read-only |
| BUG-035 | **RLS hardening 067/071 no-op** — DROP policy nama salah | ✅ Fixed (migration 072) | Drop nama benar + ENABLE RLS tiktok/survey_logs + hardening accounting |
| BUG-036 | **`order_logs_action_check` menolak `payment_verified`** | ✅ Fixed (migration 072) | Constraint = union codebase + data live |
| BUG-037 | **Kolom live hilang dari schema reference** | ✅ Fixed (migration 072) | Sinkron `000_full_schema.sql` = kondisi live |
| BUG-038 | **Settlement TikTok "main net"** — fee tidak pernah masuk jurnal | ✅ Fixed (migration 073) | Piutang gross + 3 jurnal idempotent + breakdown fee |
| BUG-039 | **Mapping settlement terbalik** (`settlement_amount` gross dipakai sebagai kas) | ✅ Fixed (migration 073) | Kas = `revenue_amount` (net); settlement = revenue + fee |
| BUG-040 | **Fail-open DELETE order** `?? 'admin'` | ✅ Fixed | Deny kalau profil tak ada / non-admin-owner aktif |
| BUG-041 | **`consume-materials` tanpa role check** | ✅ Fixed | +role check gudang/admin/owner |
| BUG-042 | **Surveys fail-open** + POST tanpa role gate | ✅ Fixed | role `?? null` → deny; POST/GET surveyor/admin/owner |
| BUG-043 | **install-bookings PUT mass-assignment** + `actual_date` tidak tersimpan | ✅ Fixed | Whitelist field; installer tetap hanya status |
| BUG-044 | **po-delivery GET tanpa auth** & **journal GET login-only** | ✅ Fixed | GET + auth/role; journal GET finance/admin/owner |
| BUG-045 | **TikTok webhook non-timing-safe** (`!==` string compare) | ✅ Fixed | `crypto.timingSafeEqual` |
| BUG-046 | **TikTok OAuth callback mati** (getUser null → 401); **rate limit IP spoofable** | ✅ Fixed | Hapus gate callback; `getClientIp()` anti-spoof |
| BUG-047 | **Route POST login-only tanpa role check** (customers/materials/products/suppliers/install-bookings/orders/PR) | ✅ Fixed | POST → admin/owner; PR → gudang/admin/owner |
| BUG-048 | **`/api/upload`** — service client module-scope + semua role upload 100MB | ✅ Fixed | Service client pindah ke handler + scope folder per role |
| BUG-049 | **Jurnal `is_auto` selalu false** — flag dibuang server | ✅ Fixed | `is_auto` diterima body + divalidasi schema |
| BUG-050 | **`piutang.remaining` dua sumber** — di-write 4 tempat tak pernah dibaca | ✅ Fixed | Hapus write → satu sumber derived (`amount−paid−return−fee`) |
| BUG-051 | **setup-accounts**: race bootstrap + bocor kredensial | ✅ Fixed | Rate limit semua path + double-check + kredensial tidak di-echo |
| BUG-052 | **Xendit webhook**: amount tidak divalidasi; jurnal gagal hanya log | ✅ Fixed | Validasi ≤ sisa + idempotency; jurnal gagal → 500 (retry) |
| BUG-053 | **sync-to-main-orders**: error `continue` (order hilang); existing tanpa jurnal tak diperbaiki | ✅ Fixed | Error → BLOCK; `ensurePaymentAndJournal` + repair |
| BUG-054 | **TikTok webhook single-secret** | ✅ Fixed | Per-shop via `shop_cipher` di DB, fallback env |
| BUG-055 | **Accounts `type='income'`** di luar CHECK | ✅ Fixed (migration 074) | `income → revenue` + VALIDATE constraint |
| BUG-056 | **Pipeline macet di produksi** — consume-materials sebelum update status | ✅ Fixed | Pindah consume-materials SETELAH status `done` |
| BUG-057 | **Installer tidak bisa upload foto checklist** (folder evidence 403) | ✅ Fixed | Tambah `installer` ke `FOLDER_ROLES.evidence` |
| BUG-058 | **Jurnal server-path 100% gagal 401** (fetch tanpa cookie) | ✅ Fixed | `createJournalEntry` panggil RPC `create_journal_atomic` langsung (bypass HTTP) |
| BUG-059 | **RLS permissive orders/customers/materials/suppliers/install_bookings** | ✅ Fixed (migration 078) | Role-based RLS 5 tabel + revoke grant anon; diverifikasi user-level |
| BUG-060 | **DP auto-catat tanpa jurnal `payment_received`**; cancel bikin jurnal hantu | ✅ Fixed | Auto-DP + jurnal idempotent; cancel reverse jurnal yang benar-benar ada |
| BUG-061 | **`orders.scheduled_installation_time` TIDAK ada di live** | ✅ Fixed (migration 077) | `ADD COLUMN IF NOT EXISTS` + sync schema |
| BUG-062 | **PO PUT `received`/`paid` bisa dobel** | ✅ Fixed | Guard transisi + idempotent submit + idempotency key jurnal |
| BUG-063 | **Xendit webhook retry balas 200 tanpa repair** | ✅ Fixed | Webhook Xendit DIHAPUS (Xendit tidak dipakai) — bug mati bersama route |
| BUG-064 | **QC mobile tab render daftar RETUR** (copy-paste) | ✅ Fixed | Render item QC pending |
| BUG-065 | **`/admin/shipping` tombol Input Resi utk order `ready`** (API menolak) | ✅ Fixed | Gate tombol hanya `packed` |
| BUG-066 | **Teks korup Mandarin** di modal installer | ✅ Fixed | Perbaiki string |
| BUG-067 | **Stock Opname selisih diformat `formatRp`** ("Rp-3") | ✅ Fixed | Format angka qty, bukan uang |
| BUG-068 | **Form `/admin/seo` menulis meta tapi `layout.tsx` HARDCODED** | ✅ Fixed | `generateMetadata()` async baca `landing_settings`, fallback hardcoded |
| BUG-069 | **TikTok double-booking revenue** (order & settlement 2×) | ✅ Fixed (model akrual) | Order path = revenue; Settlement path = kas+beban. Revenue/kas/fee ×1 |
| BUG-070 | **Order TikTok AWAITING_SHIPMENT tak masuk main orders** | ✅ Fixed | `payment_status` dari field payment TikTok, fallback COMPLETED/DELIVERED→PAID |
| BUG-071 | **Steam rework macet** (steam_job stale tak diganti) | ✅ Fixed | Guard cari `.eq('status','pending')` |
| BUG-072 | **Hutang delete tanpa guard paid** | ✅ Fixed | Tolak hapus paid/cancelled/paid_amount>0/return_amount>0 |
| BUG-073 | **Finance pay race / tanpa rollback** | ✅ Fixed | `handlePay`: jurnal gagal → hapus payment row (rollback penuh); `ordErr` → hapus row |
| BUG-074 | **Dropdown/select tidak ikut tema dark** | ✅ Fixed | CSS global `select` + `var(--surface)/var(--input-border)` di 8 titik |
| BUG-075 | **Tampilan tanggal mentah YYYY-MM-DD** | ✅ Fixed | Helper `formatDateDDMMYYYY()` di 16 file |
| BUG-078 | **Landing theme preset & konten tidak berubah** | ✅ Fixed | Merge kolom terpisah (utama) + value JSON (fallback) |
| BUG-079 | **Search pesanan kosong** — `.or()` tidak dukung kolom relasi | ✅ Fixed (migration 081) | RPC `search_orders` filter di SQL, return `{rows,total}` |
| BUG-080 | **Task laundry tak bisa diterima** — constraint tanpa `in_progress` | ✅ Fixed (migration 082) | Drop + recreate constraint lengkap |
| BUG-081 | **RLS `landing_settings` terbuka** | ✅ Fixed (migration 083) | Policy write → `is_admin_or_owner_sd()` |
| BUG-082 | **Upload sitemap/robots "failed" padahal sukses** | ✅ Fixed | Kontrak `{ success: true }`; isi disimpan ke DB |
| BUG-083 | **Trust badges tidak tampil di landing** | ✅ Fixed | `ScrollHero` terima prop `trustBadges` dari DB |
| BUG-084 | **Preset tema `modern` berisi CSS-var** bukan hex | ✅ Fixed | Preset → hex nyata |
| BUG-085 | **`/owner/staff` kosong** — `order_logs(count)` ambigu (PGRST201) | ✅ Fixed | `select('*')`; kolom Email dihapus; urutan role lengkap 8 + badge |
| BUG-086 | **GET `orders/[id]` tanpa role gate** (PII pelanggan bocor) | ✅ Fixed (Phase 1) | Role-gate server-side: admin/owner/finance/gudang + active |
| BUG-087 | **GET `install-bookings` & `[id]` tanpa role/ownership** | ✅ Fixed (Phase 1) | Koleksi: admin/owner/finance semua, installer miliknya; `[id]` mirror PUT |
| BUG-088 | **Komentar usang "RLS users terbuka"** | ✅ Fixed (Phase 1) | Verifikasi live → komentar diperbaiki, tanpa migration redundant |
| BUG-089 | **GET bebas materials/suppliers/PR/PO** + tanpa cek active | ✅ Fixed (Phase 1) | Role-gate pengadaan/finance + cek `status='active'` |
| BUG-090 | **Client fail-open `role ?? 'admin'`** (login/layout/survey) | ✅ Fixed (Phase 1) | Fail-closed: role null → signout/redirect |
| BUG-091 | **Rate limit hanya 1/33 route** | ✅ Fixed (Phase 2) | `checkRateLimit` di 9 route sensitif |
| BUG-092 | **`create-staff` lemah** (status, password min 6, enumeration, role laundry absen) | ✅ Fixed (Phase 2) | Cek active; password min 8; error redaksi; role laundry lengkap |
| BUG-093 | **TikTok OAuth `state` = shop id (predictable)** | ✅ Fixed (Phase 2, migration 084) | Nonce random single-use di kolom `oauth_state` |
| BUG-094 | **Asimetri rollback jurnal finansial** (sebagian hanya toast warning) | ✅ Fixed (Phase 3) | Seragamkan pola BUG-073 di SEMUA jalur (refund/hutang/piutang/payroll/aset) |
| BUG-095 | **Hardcoded UUID akun + double-count saldo** di `accounts/accounts` | ✅ Fixed (Phase 3) | `getAccountIdByCode` (lookup by code) + `fetchAccountBalances` (satu sumber) |
| BUG-096 | **PO paid tanpa jurnal di `owner/suppliers`** | ✅ Fixed (Phase 3) | `updatePOStatus('paid')` → jurnal `hutang_paid` idempotent + rollback |
| BUG-097 | **`markAsPaid` payroll tanpa idempotency_key** | ✅ Fixed (Phase 3) | `laundry_payroll_paid:<id>` + rollback penuh |
| BUG-098 | **`kronologi-hpp` misnamed + `.limit(200)`** | ✅ Fixed (Phase 4) | Rename "Kronologi Omzet" + pagination server-side (range+count, default 50) |
| BUG-099 | **`lte '...-31'` di owner/marketplace** (bulan 30 hari terpotong) | ✅ Fixed (Phase 4) | Akhir bulan dinamis `new Date(year, month, 0)` + batas T00:00/T23:59 |
| BUG-100 | **Rumus sisa piutang berpotensi divergen** | ✅ Fixed (Phase 4) | Helper `piutangSisa()` di `lib/ledger.ts` (satu sumber kebenaran) |
| BUG-101 | **`admin/reports` `.limit(200)` + filter client** | ✅ Fixed (Phase 4) | Filter periode ke server (`gte/lte` current+prev utk MoM) |
| BUG-102 | **`admin/portfolio` (`.limit(50)`) & `admin/laundry` (`.limit(100)`) tanpa pagination** | ✅ Fixed (Phase 5) | Portfolio server-side 12/halaman; Laundry client-side 20/halaman |
| BUG-103 | **`theme_preset` tidak berubah ke `custom` saat edit warna** | ✅ Fixed (Phase 5) | `updateThemeColor()` set preset custom bila tak cocok |
| BUG-104 | **`handleSave` landing tak deteksi "0 rows updated"** | ✅ Fixed (Phase 5) | Cek `count` → 0 = toast error |
| BUG-105 | **Kredensial default hardcoded di `setup/page.tsx`** | ✅ Fixed (Phase 5) | Default dihapus → field kosong |
| BUG-106 | **Karakter Cina korup di installer checklist** | ✅ Fixed (Phase 5) | Ganti string; sisa Cina di SDK = komentar dead code (sudah dihapus) |
| BUG-107 | **Dead code `tiktok-shop-sdk/` (1.971 file, 0 import)** | ✅ Fixed (Phase 6A) | Hapus permanen + deps `request`/`@types/request` |
| BUG-108 | **Nav laporan keuangan duplikat** (finance/owner copy-paste) | ✅ Fixed (Phase 6C) | Shared `ReportsNav.tsx` (prop `basePath`) |
| BUG-109 | **Notifikasi polling 30s (bukan realtime)** | ✅ Fixed (Phase 6D, migration 085) | Realtime `postgres_changes` (INSERT, filter user) |
| BUG-110 | **Monolit `admin/orders/[id]`** — LOG_ACTION & checklist inline | ✅ Fixed (Phase 6B-1) | Pindah ke `lib/order-detail.ts` + unit test (+3, 27 total) |
| BUG-111 | **Monolit order detail — 5 modal besar inline** | ✅ Fixed (Phase 6B-2) | Ekstrak ke `components/orders/`; page 3.561 → 2.923 baris |
| BUG-112 | **Monolit order detail — section render besar inline** | ✅ Fixed (Phase 6B-3) | Ekstrak `OrderPipelineStepper`/`OrderSurveySection`/`OrderSummarySection` |
| BUG-113 | **Monolit order detail — OrderItems + AddItemModal + Checklist** | ✅ Fixed (Phase 6B-3d) | Ekstrak `OrderItemsTable`/`PreparationChecklist`/`AddItemModal`; page → 1.490 baris |
| BUG-114 | **Monolit order detail — seluruh state & handlers inline** | ✅ Fixed (Phase 6B-4) | Semua state+handlers → `useOrderDetail(id)` hook; page **505 baris** (−85%) |
| BUG-115 | **RLS katalog publik terbuka** (products/categories/banners/portfolio_posts/bom); helper bisa dieksekusi anon; users SELECT semua authenticated | ✅ Fixed (migration 087) | Write katalog/bom → `is_admin_or_owner_sd()`; REVOKE anon/PUBLIC helper; users SELECT → `is_staff_active_sd()`. **Verifikasi**: penjahit ditolak 42501, admin sukses |
| BUG-116 | **`laundry_orders.order_id` tidak ada di live** — schema & TS type (`LaundryOrder.order_id`) memakai kolom ini, tapi live hanya punya `item/qty/price/notes` → insert item laundry di order detail (`use-order-detail.ts:610`) **pasti gagal 42703**. Drift lawan arah: kolom legacy live (`assets.purchase_cost`, `order_progress_photos.caption`, `material_price_history.old_cost/new_cost/changed_by`, `laundry_orders.item/qty/price/notes`) tidak ada di schema file; `landing_settings.value` & `material_price_history.created_at` dipakai codebase tapi hilang dari schema | ✅ Fixed (migration 088, 2026-08-13) | (1) `ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL` + index. (2) Sync `000_full_schema.sql` = live (5 tabel: laundry_orders, landing_settings, material_price_history, assets, order_progress_photos). **Verifikasi user-level**: INSERT laundry + order_id sebagai admin → sukses, data uji dibersihkan. tsc + build + vitest 27/27 |

---

## 3. Dead Code — Status Aktual (2026-08-13)

- **Route API DIHAPUS** (migration 086 / sesi 35, keputusan user — tidak ada caller produksi, UI berjalan via Supabase client langsung): `api/customers`, `api/landing-settings`, `api/materials`, `api/products`, `api/suppliers`, `api/purchase-orders` (+`[id]`), `api/purchase-requests` (+`[id]`), `api/install-bookings` (base). **Dipertahankan** (dipakai): `api/orders` base (smoke test), `api/orders/[id]`, `api/install-bookings/[id]`, `api/notifications`, `api/surveys`, `api/journal`, `api/upload`, `api/seo/*`, `api/tiktok/*`, `api/setup-accounts`, `api/admin/create-staff`, `api/gudang/po-delivery`, `api/webhooks/*`.
- **Tabel DI-DROP** (086): `packing_checklists`, `return_requests`, `order_preparation_checklist` (singular). **Dipertahankan**: `low_stock_alerts`, `order_material_consumption` (ditulis RPC produksi aktif `consume_materials_for_production`). `seo_settings` di-drop migration 079.
- **RPC DI-DROP** (086): `decrement_stock_gudang`, `get_material_stock`, `get_product_stock`, `update_cash_account_balance`. **Dipertahankan**: `rls_auto_enable` (dipanggil event trigger `ensure_rls` utk RLS otomatis).
- **Export DIHAPUS**: `clientError` (`src/lib/api-errors.ts`) — nol referensi.
- **Schema drift fix:** `users.email` dihapus dari `000_full_schema.sql` (tidak ada di live).

---

## 4. Audit Modul Finance

> Snapshot audit **2026-08-11** (76 temuan: F-01 s/d F-76). **Semua temuan sudah ditangani** di sesi-sesi berikutnya (lihat tabel BUG & riwayat fase). Dokumen ini diringkas dari `audit-finance.md` asli; detail per baris tidak dipertahankan.

### Ringkasan Eksekutif
76 temuan: **14 🔴 CRITICAL, 21 🟡 HIGH, 27 🟠 MEDIUM, 14 🟢 LOW** (73 dari 3 subagent paralel + 3 temuan settlement marketplace F-74/F-75/F-76). Tiga masalah akar:
1. **RLS semua tabel keuangan = `FOR ALL authenticated`** → siapa pun login bisa baca-tulis buku besar/jurnal/pembayaran (gate UI kosmetik).
2. **Double-entry tidak konsisten antar jalur** — sebagian transaksi bikin jurnal, sebagian tidak; jurnal 2 query terpisah tanpa transaksi atomik.
3. **Laporan keuangan bug fundamental** — filter periode tak refetch, `normal_side` mati, neraca tidak balance, agregasi NUMERIC, 4 sumber kebenaran berbeda.

### 🔴 CRITICAL (14)
| Area | Temuan inti | Status fix |
|---|---|---|
| A. Keamanan & RLS | F-01 RLS semua tabel accounting permissive · F-02 `/api/journal` tanpa role check · F-03 `exec_sql` backdoor · F-04 RPC saldo kas tanpa role | BUG-018/019/032/035/059 + migration 063/067/072/078 |
| B. Gate approval | F-05 gate approval bypassable (self-verification) · F-06 `handleQcApprove` broken · F-07 refund rusak + dead policy returns | BUG-012/027/028 + refund transaksional |
| C. Double-entry | F-08 jurnal order hanya di API · F-09 bayar hutang tanpa jurnal · F-10 piutang putus total · F-11 payroll/aset tanpa jurnal · F-12 jurnal selalu debit Xendit Cash · F-13 alur Xendit duplikat | BUG-022/034/038/058/060 + migration 064/073/077 |
| D. Laporan | F-14 `normal_side` NULL → tanda saldo terbalik | BUG-010 (hitung dari `a.type`) |

### 🟡 HIGH (21)
F-15 revenue tanpa filter · F-16 piutang dashboard overstatement · F-17 aging dari created_at · F-18 transfer race · F-19 jurnal+RPC terpisah → kas bon · F-20 saldo kas bisa di-set manual · F-21 edit faktur bebas · F-22 akun kas tanpa COA · F-23 generatePayroll menimpa paid · F-24 multi-entry payment tanpa jurnal · F-25 dua sumber saldo kas · F-26 umur-hutang overstatement · F-27 umur-piutang overstatement · F-28 mapping selisih kurs net-zero · F-29 PDF `setTextColor(CSS var)` rusak · F-30 tarif upah hardcode · F-31 dua kolom sumber order · F-32 filter periode DEAD · F-33 mutasi-kas baca balance statis · F-34 neraca tanpa laba berjalan · F-35 agregasi NUMERIC (→ **false positive**, BUG-020)

→ **Semua fixed**: BUG-015/016/017/020/022/025/026/027/028/030/034 + migration 064/073.

### 🟠 MEDIUM (26)
F-36 validasi amount · F-37 running balance · F-38 hutang race/cancelled · F-39 catatan pay tak tersimpan · F-40 piutang/payment read-only · F-41 process tampil semua · F-42 Order ID free-text · F-43 float JS · F-44 mobile retur · F-45 mobile saldo · F-46 stat pesanan termasuk cancelled · F-47 GET limit tanpa cap · F-48 handlePay state basi · F-49 N+1 accounts · F-50 mapping-difference UNIQUE error · F-51 aset terpisah dari akuntansi · F-52 refund tab mobile salah · F-53 fetch halaman aktif saja · F-54 jurnal tanpa idempotency · F-55 payroll tanpa verifikasi · F-56 error.message mentah · F-57 jurnal non-atomik · F-58 buku besar tanpa detail · F-59 daftar-jurnal limit 100 · F-60 performa-tag limit 500 · F-61 4 sumber kebenaran

→ **Semua fixed**: BUG-023/025/034/050 + migration 064.

### 🟢 LOW (12)
F-62 jurnal order warn saja · F-63 toast ganda · F-64 tanggal bebas backdate · F-65 jurnal-auto limit 50 · F-66 FK error mentah · F-67 formatRp desimal · F-68 timezone endDate · F-69 days negatif · F-70 handleQcApprove label · F-71 agregasi channel float · F-72 concat (→ **false positive**) · F-73 kronologi-hpp misnamed

→ **Semua fixed**: BUG-075/098 + helper `formatDateDDMMYYYY`/`piutangSisa`.

### 🆕 Temuan Tambahan: Selisih Settlement Marketplace (F-74/75/76)
- **F-74**: `exchange_rate_diff` (mapping 'Selisih kurs' seed) TIDAK dipanggil di mana pun + debit=credit net-zero. → **Repurpose** jadi 'Beban Biaya Lain E-commerce' (keputusan Near), jurnal komisi dibuat (migration 073).
- **F-75**: komisi & biaya marketplace tidak pernah dicatat (`commission_fee: 0` hardcode, `net_amount` tidak kurangi komisi). → Fixed (BUG-017/038/039): breakdown fee dari API TikTok, jurnal 3 langkah.
- **F-76**: settlement TikTok bikin piutang dari NET tanpa jurnal & tanpa relasi ke order gross. → Fixed (BUG-029/069): model akrual — order = revenue, settlement = kas+beban; piutang gross + unique reference.
- **Keputusan Near (2026-08-11)**: `exchange_rate_diff` diganti 'Beban Biaya Lain E-commerce'; halaman "Proses Retur" diimplementasikan (retur TikTok lewat sini); tombol approve #2 (cek lunas) TIDAK perlu dibuat (gate `packed` sudah otomatis di API, input lunas = approve natural); kolom & akun buku besar korporat dipertahankan; "Kronologi HPP" → "Omzet Penjualan per Periode"; mapping tetap 2 halaman; saldo awal perlu jurnal pembuka; rename sidebar (Transfer Internal Kas, Cek Pembayaran).
- **Catatan akses**: role **finance** diberi akses `/owner/marketplace` & `/owner/tiktok` via whitelist proxy (2026-08-12, `src/proxy.ts:81-87`) — tanpa membuka seluruh `/owner`.

### ✅ Yang Sudah Bagus (dipertahankan)
`/api/journal` validasi balance + rollback · `ledger.ts` saldo live dari journal_lines · validasi nominal pembayaran · validasi asal≠tujuan transfer · HMAC + unique index idempotensi · migration 059 revoke anon · optimistic update + rollback · audit log `order_logs` · payment gate di `/api/orders/[id]`.

### Rekomendasi Prioritas (semua sudah dieksekusi)
- **P0 (keamanan)**: drop `exec_sql` ✓ · RLS role-based + journal role check ✓ · hapus `handleQcApprove` ✓ · perbaiki policy returns ✓
- **P1 (kebenaran laporan)**: `normal_side` ✓ · filter periode ✓ · concat ✓ · neraca + laba berjalan ✓
- **P2 (double-entry)**: satu helper pembayaran ✓ · backfill jurnal + unique reference ✓ · Xendit webhook ✓ · hutang/piutang/payroll/aset → jurnal ✓ · cash account di form ✓
- **P3 (housekeeping)**: rename kronologi ✓ · fix PDF ✓ · tarif upah ✓
- **P4 (settlement)**: hapus/replace `exchange_rate_diff` ✓ · fitur 'Beban Komisi/Biaya Marketplace' ✓

---

## 5. Backlog / Belum Selesai (prioritas berikutnya)

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **Smoke test E2E di browser** | 🟠 High | ✅ `tests/e2e/smoke.spec.ts` — 15/15 pass: login 8 role, security (penjahit redirect + API 403), halaman kunci. Jalankan: `npx playwright test --project=chromium` |
| 2 | **Dual modal system** (`Modal` 36× vs `dialog` 3×) | ⏳ Ditunda | Keduanya jalan; konsolidasi = risiko regresi UI (nilai 0). `dialog` utk konfirmasi, `Modal` utk ringan |
| 3 | **Duplikasi kecil** | 🟢 Low | `formatRp` ✅ (42 file → import `lib/utils`). `STATUS_COLORS`/`LooseRow` sengaja dipertahankan (3 skema beda / method-call) |
| 4 | **Unique `invoice_number` piutang non-tiktok** | 🟢 Low | ✅ migration 076 + cek duplikat di faktur page |

---

## 6. Catatan Tambahan (bukan bug, tapi terkait)

1. **Penjahit bypass API**: `penjahit/jobs/page.tsx` langsung update `orders.status='steam'` dari client (auto-transition) — tidak lewat API role check. Sengaja (auto), tapi tidak ada audit role.
2. **Installer bypass**: `installer/checklist/page.tsx` langsung update `install_bookings.status='done'` dari client.
3. **Gate foto**: `admin/orders/[id]` mewajibkan upload foto untuk **semua** transisi (bukan hanya stage wajib foto), sehingga owner upload ulang bukti yang sudah ada.

---

## 7. Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```

_Dokumen konsolidasi: 2026-08-13 (sesi 37) · Menggantikan `bug.md`, `todo.md`, `audit-finance.md`_

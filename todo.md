# KJ Homedecor — Todo / Sesi Audit & Perbaikan

> **Branch:** `main` · Update terakhir: 2026-08-12 (sesi 4 — security API fix)

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

## ⏳ Belum Selesai (prioritas berikutnya — Sesi 5)

> Item yang SUDAH dikerjakan di sesi 3/4 (TikTok auth GET, RLS, fail-open, mass-assignment, dsb.) sudah dihapus dari daftar — tidak perlu di-fix ulang.

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **Smoke test E2E di browser** | 🟠 **High** | Dev server `localhost:3000`; test login 8 role + fitur baru: reset data, faktur/SJ, laundry, rekonsiliasi, **TikTok sync** (cek piutang gross + 3 jurnal tidak dobel), security fix (role lain → 403) |
| 2 | **Server-side price validation** | 🟡 Medium | `orders/route.ts` masih terima `total_amount` dari client (`.optional()`) — hitung ulang dari items di server |
| 3 | **Tests suite** | 🟡 Medium | vitest/playwright mengarah ke `tests/` yang tidak ada — perlu buat ulang suite (minimal state machine `orders.ts` + smoke E2E) |
| 4 | **Route POST login-only tanpa role check** | 🟡 Medium | `customers`, `materials`, `products`, `suppliers`, `purchase-requests`, `install-bookings`, `orders` POST — perlu keputusan: semua role boleh? atau batasi (terutama `materials`/`products`/`suppliers` yang ubah harga/cost) |
| 5 | **`/api/upload`** | 🟡 Medium | Service client di module-scope + semua role bisa upload video 100MB; scope folder per role (`videos`/`documents` → admin/owner) |
| 6 | **Docs sync** | 🟢 Low | README L189/L202 (migration 71 → 3 file) & L252 (route list); `docs/flows/10-staff-akses.md`; `audit-finance.md` F-35/F-72 false positive |
| 7 | **setup-accounts race** | 🟢 Low | 2 request paralel saat DB kosong → 2 admin; response bocorkan kredensial |
| 8 | **TikTok webhook multi-secret** | 🟢 Low | `TIKTOK_APP_SECRET` env vs `app_secret` per-shop di DB |
| 9 | **Xendit webhook amount** | 🟢 Low | Amount tidak divalidasi ≤ remaining order |
| 10 | **sync-to-main-orders** | 🟢 Low | Tanpa pagination (max 100 order); insert tanpa error-block (`continue` → order hilang diam-diam); `console.log` data mentah |
| 11 | **Jurnal `is_auto`** | 🟢 Low | createSimpleJournal kirim `true`, `api/journal` hardcode `false` |
| 12 | **Jurnal webhook silent-fail** | 🟢 Low | Kegagalan jurnal di webhook Xendit/TikTok hanya `console.error` → hilang diam-diam (webhook tetap 200) |
| 13 | **`piutang.remaining` dua sumber** | 🟢 Low | Rekonsiliasi pakai derived (`amount−paid−return−fee`), kolom `remaining` tidak dipakai |
| 14 | **Duplikasi kode** | 🟢 Low | `NAV_BY_ROLE` 2×; owner/laporan = salinan finance/laporan (~2.2k baris); `formatRp` 50×; `STATUS_COLORS` 17×; `LooseRow` 26× |
| 15 | **Dead deps** | 🟢 Low | `pg` (0 usage), `request` (deprecated), `shadcn`, `@tanstack/react-query` (0 import), `react-hook-form` |
| 16 | **Data cleanup accounts** | 🟢 Low | Baris `accounts` type non-standar (constraint 067 NOT VALID) |
| 17 | **Fitur stock opname UI** | 🟢 Low | Tabel `stock_opname_sessions/items` ada tapi belum ada halaman/kode; RPC `approve_stock_opname` belum dibuat — fitur baru, bukan bug |

---

## 📋 Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```

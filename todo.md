# KJ Homedecor — Todo / Sesi Audit & Perbaikan

> **Branch:** `main` · Update terakhir: 2026-08-12 (sesi 2 — sinkronisasi & klarifikasi orphan)

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

## ⏳ Belum Selesai (prioritas berikutnya — Sesi 3)

| # | Item | Priority | Catatan |
|---|---|---|---|
| 1 | **Smoke test E2E di browser** | 🟠 **High** | Dev server `localhost:3000` (log: `%TEMP%\opencode\devserver.log`); test login 8 role + fitur baru: reset data (`/owner/settings` ketik RESET), faktur/SJ di `admin/orders/[id]`, dashboard `/laundry` (terima task → lapor selesai kg_actual), rekonsiliasi `/finance/rekonsiliasi` |
| 2 | **Server-side price validation** | 🟡 Medium | `orders/route.ts:13` masih terima `total_amount` dari client (`.optional()`) — peluang manipulasi harga; hitung ulang dari items di server |
| 3 | **TikTok auth/route GET rusak** | 🟡 Medium | Service client + `getUser()` selalu null → OAuth callback mati; juga cek `reauthorize` |
| 4 | **Tests suite** | 🟡 Medium | vitest/playwright mengarah ke `tests/` yang tidak ada — perlu buat ulang suite |
| 5 | **Duplikasi** | 🟢 Low | `NAV_BY_ROLE` 2× (Sidebar.tsx:60 vs TopNav.tsx:56, sudah drift); owner/laporan = salinan finance/laporan (~2.2k baris) |
| 6 | **Dead deps** | 🟢 Low | `pg` (0 usage), `request` (deprecated, cuma SDK generated), `shadcn` di dependencies |
| 7 | **Data cleanup accounts** | 🟢 Low | Baris `accounts` type non-standar (constraint 067 NOT VALID) — cek & perbaiki manual |
| 8 | **Fitur stock opname UI** | 🟢 Low | Tabel `stock_opname_sessions/items` ada (migration 040) tapi belum ada halaman/kode; RPC `approve_stock_opname` belum pernah dibuat — fitur baru, bukan bug |

---

## 📋 Sebelum Commit

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "..."
```

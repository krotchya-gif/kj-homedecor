# KJ Homedecor — Todo / Sesi Audit & Perbaikan

> **Branch:** `main` · Update terakhir: 2026-08-13 (sesi 30 — Phase 6B-2: ekstrak 5 modal order detail)

---
## ✅ Selesai (2026-08-13 — Sesi 30: Phase 6B-2 — Ekstrak 5 Modal Order Detail)

1. ✅ **BUG-111 — 5 modal diekstrak ke `components/orders/`**: `ScheduleInstallModal`, `PhotoUploadModal`, `CancelOrderModal`, `ReturnModal`, `PaymentModal` — state & handler tetap di parent (behavior-preserving).
2. ✅ Page `admin/orders/[id]` turun **3.561 → 2.923 baris** (−638).
3. ✅ Verifikasi: `tsc` + `build` hijau, `vitest` 27/27. Docs: `bug.md` (BUG-111), `README.md`, `todo.md`.

**Lanjutan 6B:** → **6B-3** (ekstrak section render: PipelineStepper, CustomerInfo, OrderItems, PreparationChecklist, HasilSurvey) → **6B-4** (useOrderDetail hook) → **6B-5** (verifikasi pipeline kirim/pasang + commit final).

---
## ✅ Selesai (2026-08-13 — Sesi 29: Phase 6B-1 — Pure Logic Order Detail)

1. ✅ **BUG-110 — `LOG_ACTION` map & `DEFAULT_CHECKLIST` dipindah ke `lib/order-detail.ts`** (`getOrderLogAction` + `DEFAULT_CHECKLIST`) — behavior-preserving, unit test +3 (27 total).
2. ✅ Verifikasi: `tsc` + `build` hijau, `vitest` 27/27. Docs: `bug.md` (BUG-110), `README.md`, `todo.md`.

**Lanjutan 6B:** → **6B-2** (ekstrak 5 modal besar → komponen: Schedule, Photo, Cancel, Return, Payment) → 6B-3 (section render) → 6B-4 (useOrderDetail hook) → 6B-5 (verifikasi pipeline kirim/pasang + commit final).

---
## ✅ Selesai (2026-08-13 — Sesi 28: Phase 6D — Notifikasi Realtime)

1. ✅ **Migration 085 — `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`** (idempotent, guard) — sebelumnya tabel belum di-publication → realtime tidak jalan.
2. ✅ **`NotificationBell` polling 30s → `postgres_changes`** — channel `notifications-realtime`, event INSERT, filter `user_id=eq.<id>` (konsisten dgn RLS `notifications_own`), cleanup `removeChannel`. Notifikasi baru muncul langsung.
3. ✅ Sync `000_full_schema.sql` (blok publication). Verifikasi: `tsc` + `build` hijau. Docs: `bug.md` (BUG-109), `README.md`, `todo.md`.

**Lanjutan Phase 6:** → **6B** (monolit order detail 3.561 baris — tertinggi, 4 sub-langkah, TERAKHIR).

---
## ✅ Selesai (2026-08-13 — Sesi 27: Phase 6C — Dedup Nav Laporan Keuangan)

1. ✅ **BUG-108 — shared `components/reports/ReportsNav.tsx`** (prop `basePath`) — `finance/laporan/page.tsx` & `owner/laporan/page.tsx` kini wrapper tipis (~5 baris). Hapus duplikasi copy-paste (10 kartu laporan + COLOR_MAP).
2. ✅ Verifikasi: `tsc` + `build` hijau. Docs: `bug.md` (BUG-108), `README.md`, `todo.md`.

**Lanjutan Phase 6:** → **6D** (notifikasi realtime — sedang, cek realtime enabled dulu) → **6B** (monolit order detail — tertinggi, 4 sub-langkah, paling akhir).

---
## ✅ Selesai (2026-08-13 — Sesi 26: Phase 6A — Hapus Dead SDK `tiktok-shop-sdk`)

1. ✅ **BUG-107 — `src/lib/tiktok-shop-sdk/` (1.971 file) dihapus permanen** — SDK auto-generated, 0 import di `src/` (diverifikasi), integrasi aktual via `lib/tiktok.ts`. 
2. ✅ **Dependensi `request` & `@types/request` dihapus** — hanya dipakai SDK; `package-lock.json` bersih.
3. ✅ **Proses anti-regresi (per plan Phase 6):** pindah ke `_dead/` → `tsc`+`build` hijau → hapus permanen → hapus deps + `npm install` → `tsc` + `build` + `vitest 24/24` hijau → `rg "tiktok-shop-sdk"` kosong.
4. ✅ Docs: `bug.md` (BUG-107), `README.md`, `todo.md`.

**Lanjutan Phase 6:** → **6C** (dedup nav laporan finance/owner — risiko rendah) → **6D** (notifikasi realtime — sedang) → **6B** (monolit order detail — tertinggi, 4 sub-langkah, paling akhir).

---
## 📋 PLAN Phase 6 — Refactor & Dead Code (BERTAHAP, anti-regresi)

> **Konteks:** item-item ini BERISIKO REGRESI TINGGI (jalur kritis order pipeline, 1.971 file dead SDK).
> Karena itu dikerjakan **bertahap kecil** — tiap langkah: build + test + cek halaman, baru lanjut.
> Prinsip: JANGAN gabung refactor dengan perubahan fungsional; 1 PR kecil = 1 verifikasi.

### Prinsip eksekusi (wajib, per SOP AGENTS.md)
1. Tiap sub-langkah berdiri sendiri & **build-pass** (`tsc` + `npm run build`) sebelum lanjut.
2. **Jangan ubah perilaku** selama refactor — hanya memindah/pisah kode (behavior-preserving).
3. Jalankan `vitest run` (24 test) + cek manual halaman terkait setiap beberapa langkah.
4. Commit per milestone kecil → mudah rollback kalau ada regresi.

### 6A. Hapus dead code `tiktok-shop-sdk/` (PALING AMAN — mulai dari sini)
- **Fakta:** 1.971 file, **0 import** di seluruh `src/` (sudah diverifikasi). Integrasi aktual pakai `lib/tiktok.ts` + fetch manual.
- **Langkah:**
  1. Pindahkan folder ke `src/lib/_dead/tiktok-shop-sdk/` (bukan hapus langsung → bisa restore) — lalu `tsc` + build untuk bukti 0 break.
  2. Kalau build hijau → hapus folder permanen.
  3. Cek dependensi yang hanya dipakai SDK (`request` di package.json — SDK token.ts pakai `request`). Kalau SDK dihapus & `request` tak terpakai → hapus dependency + npm install.
- **Risiko:** sangat rendah (0 import). Verifikasi: `rg "tiktok-shop-sdk"` kosong.

### 6B. Refactor monolit `admin/orders/[id]` (3.561 baris) — BERTAHAP
> Jalur kritis pipeline — refactor PURE (pindah kode, tanpa ubah logika). Sudah ada partial: `lib/order-detail.ts`, `lib/orders.ts`, `lib/invoice.ts`, komponen `OrderActivityLog` (todo sesi 6 menyebut sudah selesai).

- **6B-1. Pisahkan logika murni (pure functions) yang masih inline:**
  - Hitung sisa bayar, parse meter gorden, warna status/payment, `canRoleAdvanceNext`, format label — pindah ke `lib/order-detail.ts` (jika belum), lalu import. **Verifikasi:** test unit baru utk fungsi yang dipindah.
- **6B-2. Ekstrak modal besar menjadi komponen terpisah** (1 modal per file):
  - `ScheduleInstallModal` (Jadwalkan Pasang, ~1.100 baris area 2810)
  - `PhotoUploadModal` (2952)
  - `CancelOrderModal` (3112) · `ReturnModal` (3179) · `PaymentModal` (3382)
  - Tiap modal: pindah JSX + handler terkait → komponen ber-props (order, callbacks, supabase). **Verifikasi:** buka detail order sebagai admin — semua modal jalan.
- **6B-3. Ekstrak section render (non-modal) bertahap:**
  - `PipelineStepper` (1306) · `CustomerInfoBlock` (1459) · `OrderItemsTable` (1650) · `PreparationChecklist` (1785)
  - **Verifikasi per section:** render benar utk status kirim & pasang, role berbeda.
- **6B-4. Terakhir:** page utama jadi komposisi (`useOrderDetail` hook + komponen), target < 1.000 baris.

- **Risiko:** TINGGI (pipeline). Mitigasi: behavior-preserving, test unit utk pure logic, cek manual pipeline kirim+pasang setelah tiap milestone. **JANGAN dikerjakan sekaligus.**

### 6C. Duplikasi laporan `finance/laporan` vs `owner/laporan`
- **Fakta:** 10 laporan sudah pakai shared component (`components/reports/*` + `variant`). Yang tersisa: **nav page copy-paste** (`finance/laporan/page.tsx` vs `owner/laporan/page.tsx` — beda hanya href).
- **Langkah:** buat shared `components/reports/ReportsNav.tsx` (prop `basePath`), kedua route jadi wrapper tipis.
- **Risiko:** rendah. Verifikasi: kedua halaman render daftar 10 laporan dgn link benar.

### 6D. Notifikasi polling → realtime (`NotificationBell`)
- **Fakta:** polling `setInterval(30s)` di `NotificationBell.tsx:41`.
- **Langkah:** ganti dengan `supabase.channel('notif').on('postgres_changes', { table: 'notifications', filter: user_id=eq.<id> })` — subscription dibuat saat user login, cleanup di unmount; polling dihapus.
- **Risiko:** sedang (realtime perlu RLS/REALTIME enabled pada tabel). Verifikasi: notification muncul tanpa refresh saat row baru diinsert (simulasi via SQL). **Catatan:** pastikan `notifications` punya `replica identity` / realtime diaktifkan (cek via MCP `get_advisors`/SQL) SEBELUM eksekusi.

### Urutan eksekusi yang disarankan
1. **6A** (dead SDK) — risiko paling rendah, buang paling besar (1.971 file).
2. **6C** (duplikasi laporan) — rendah, cepat.
3. **6D** (realtime notif) — sedang, mandiri.
4. **6B** (monolit order detail) — TERAKHIR & paling bertahap (4 sub-langkah), jalur kritis.

> Setiap milestone selesai → update `bug.md`/`README.md`/`todo.md` (SOP #7) + stop & lapor.

---

## ✅ Selesai (2026-08-13 — Sesi 24: Phase 5 — Perbaikan UI Cepat)

1. ✅ **BUG-102 — Pagination** — `admin/portfolio` (server-side, 12/halaman) & `admin/laundry` (client-side pada filtered, 20/halaman, reset saat search/filter).
2. ✅ **BUG-103 — `theme_preset` → `custom`** saat user edit warna manual (`updateThemeColor`).
3. ✅ **BUG-104 — `handleSave` landing deteksi 0 rows updated** (anti toast sukses palsu).
4. ✅ **BUG-105 — kredensial default dihapus dari `setup/page.tsx`** (field kosong).
5. ✅ **BUG-106 — karakter Cina korup di installer checklist** diperbaiki (garbled string BUG-066 lanjutan).

**Verifikasi:** `tsc --noEmit` ✅ · `npm run build` ✅ · `vitest run` 24/24 ✅. Docs: `bug.md` (BUG-102–106), `README.md`, `todo.md`.

**Fase berikutnya:** Phase 6 (refactor & dead code — backlog: monolit order detail, tiktok-shop-sdk dead code, duplikat laporan finance/owner, notifikasi polling→realtime).

---
## ✅ Selesai (2026-08-13 — Sesi 23: Phase 4 — Akurasi Laporan)

1. ✅ **BUG-098 — `kronologi-hpp` di-rename jadi "Kronologi Omzet"** — file `kronologi-omzet.tsx`, route finance & owner, label di hub laporan, PDF filename; plus pagination server-side (range + count, default 50) menggantikan `.limit(200)`.
2. ✅ **BUG-099 — `lte '-31'` di owner/marketplace** — akhir bulan dihitung dinamis (`new Date(year, month, 0)`), batas T00:00/T23:59; bulan 30 hari & Februari kini terhitung benar.
3. ✅ **BUG-100 — helper `piutangSisa()` di `lib/ledger.ts`** — satu sumber kebenaran (amount − paid − return − fee, clamped ≥ 0); dipakai di umur-piutang & finance dashboard (rumus lain sudah seragam).
4. ✅ **BUG-101 — `admin/reports` filter server-side** — periode current + prev utk MoM via `gte/lte`, tanpa `.limit(200)` → laporan akurat utk semua data.

**Verifikasi:** `tsc --noEmit` ✅ · `npm run build` ✅ (route `kronologi-omzet` finance & owner) · `vitest run` 24/24 ✅. Docs: `bug.md` (BUG-098–101), `README.md`, `todo.md`.

**Fase berikutnya:** Phase 5 (UI cepat — garbled string installer, pagination portfolio, theme_preset→custom, handleSave 0-rows, kredensial setup) → Phase 6 (refactor/dead code, backlog).

---
## ✅ Selesai (2026-08-13 — Sesi 22: Phase 3 — Integritas Akuntansi)

1. ✅ **BUG-094 — rollback jurnal diseragamkan** (pola BUG-073) di SEMUA jalur finansial: `payments.handleRefund`, `hutang.handlePayment`, `piutang/faktur` (create+pay+adjust), `piutang/process`, `laundry-payroll.markAsPaid`, `assets.create`. Jurnal gagal → transaksi dibatalkan penuh (hapus row / kembalikan paid_amount & status) — bukan lagi toast warning yang membuat ledger bocor.
2. ✅ **BUG-095 — hardcoded UUID akun diganti lookup by code** — helper `getAccountIdByCode(supabase, code)` di `config/accounts.ts`; dipakai di assets (1401/1101), settings (3101), piutang process (1201), piutang faktur (1201/4101). Anti-drift saat DB reset.
3. ✅ **BUG-095 — double-count saldo di `accounts/accounts`** — pakai `fetchAccountBalances` (satu sumber kebenaran dgn laporan); field "Saldo Awal" dihapus dari form COA (saldo awal diatur via Finance → Settings).
4. ✅ **BUG-096 — PO paid jurnal di `owner/suppliers`** — `updatePOStatus('paid')` kini buat jurnal `hutang_paid` idempotent (`po_paid:<id>`) + rollback; seragam dgn jalur API `purchase-orders/[id]`.
5. ✅ **BUG-097 — `markAsPaid` payroll idempotency + rollback** — `laundry_payroll_paid:<id>`; jurnal gagal → payroll kembali pending.

**Verifikasi:** `tsc --noEmit` ✅ · `npm run build` ✅ · `vitest run` 24/24 ✅ · lookup akun by code live cocok dgn UUID sebelumnya. Docs: `bug.md` (BUG-094–097), `README.md`, `todo.md`.

**Fase berikutnya:** Phase 4 (akurasi laporan — `.limit(200)`, `lte '-31'`, 3 rumus piutang, `kronologi-hpp` misnamed) → Phase 5 (UI cepat) → Phase 6 (refactor/dead code, backlog terpisah).

---
## ✅ Selesai (2026-08-13 — Sesi 21: Phase 2 — Hardening API)

1. ✅ **BUG-091 — rate limit 9 route sensitif** — `checkRateLimit` (IP, in-memory) diterapkan di: `upload` (60/menit), `create-staff`, `seo/upload-sitemap`, `seo/upload-robots`, `tiktok/auth` POST+PUT, `tiktok/auth/reauthorize`, `tiktok/sync-orders`, `sync-finance`, `sync-to-main-orders`, `create-piutang`. Alasan: mencegah storage DoS, brute-force akun, dan spam panggil API eksternal TikTok.
2. ✅ **BUG-092 — `create-staff` diperkuat** — cek `status='active'` requester; password min **8**; error auth di-redaksi (anti email-enumeration, detail hanya di log server); role `laundry` ditambahkan ke enum API + `ROLES`/`ROLE_COLORS` UI (sebelumnya admin tak bisa buat akun laundry — inkonsisten 8 role).
3. ✅ **BUG-093 — TikTok OAuth state = random nonce** (migration 084) — `crypto.randomBytes(24)` disimpan di `tiktok_shop_settings.oauth_state`; callback cocokkan via nonce + hapus setelah dipakai (single-use, anti-replay); `reauthorize` ikut pola sama. Sync `000_full_schema.sql`.

**Verifikasi:** `tsc --noEmit` ✅ · `npm run build` ✅ · `vitest run` 24/24 ✅ · migration 084 live (kolom `oauth_state` ada). Docs: `bug.md` (BUG-091–093), `README.md`, `todo.md`.

**Fase berikutnya:** Phase 3 (integritas akuntansi — rollback jurnal seragam BUG-073, PO paid jurnal di owner/suppliers, idempotency markAsPaid, hapus hardcoded UUID akun, unifikasi double-count saldo).

---
## ✅ Selesai (2026-08-13 — Sesi 20: Phase 1 — Keamanan PII & Fail-Closed)

**Kontekst:** sesuai SOP Bug-Fix baru di `AGENTS.md` (bugfix-sop) — root cause → cek live DB → role-gate server-side → verifikasi user-level → sync doc per fase. Phase 1 fokus PII exposure + fail-closed.

1. ✅ **BUG-086 — GET `orders/[id]` role gate** — admin/owner/finance/gudang + active (pola GET koleksi). PII pelanggan tidak bocor ke penjahit/surveyor/installer.
2. ✅ **BUG-087 — GET `install-bookings` & `[id]`** — admin/owner/finance = semua; installer = hanya miliknya (ownership, mirror PUT).
3. ✅ **BUG-088 — Komentar usang "RLS users terbuka"** — verifikasi live: write users SUDAH dikunci admin/owner → tanpa migration baru, perbaiki komentar agar tidak menyesatkan.
4. ✅ **BUG-089 — GET bebas materials/suppliers/PR/PO** — dibatasi role pengadaan/finance; tambah cek `status='active'` di `purchase-orders` POST/PUT & `po-delivery` POST.
5. ✅ **BUG-090 — Client fail-open `role ?? 'admin'`** — login/layout/survey detail → fail-closed (role null → signout/redirect, UI tanpa tombol edit palsu).

**Verifikasi:** `tsc --noEmit` ✅ · `npm run build` ✅ · `vitest run` 24/24 ✅. Docs: `bug.md` (BUG-086–090), `README.md`, `todo.md`.

**Fase berikutnya (prioritas):** Phase 2 (rate limit, create-staff, OAuth state) → Phase 3 (integritas akuntansi — rollback jurnal seragam, PO paid jurnal, idempotency markAsPaid).

---
## ✅ Selesai (2026-08-13 — Sesi 19: Landing Settings & SEO + Fix Laundry & Owner/Staff)

### Landing settings & SEO (migration 083)
1. ✅ **BUG-081 — RLS `landing_settings` terbuka** — policy write `FOR ALL (auth.role()='authenticated')` (semua staff bisa ubah konten landing & SEO) → **hanya admin/owner** via `is_admin_or_owner_sd()`. SELECT publik tetap. Sync `000_full_schema.sql`.
2. ✅ **sitemap & robots disimpan ke DB** (bukan filesystem `public/`) — kolom `robots_content`/`sitemap_content` di `landing_settings` (key `hero`); route upload menulis ke DB; **route publik `/robots.txt` & `/sitemap.xml` baca dari DB** (fallback default) — persist saat redeploy. `proxy.ts` matcher mengecualikan kedua route (tidak perlu `getUser()`).
3. ✅ **BUG-082 — upload SEO tampil error padahal sukses** — kontrak respons API → `{ success: true }` (klien cek `data?.success`).
4. ✅ **BUG-083 — trust badges tidak tampil di landing** — `ScrollHero` terima prop `trustBadges` dari DB (fallback angka hardcoded), render di hero stats.
5. ✅ **BUG-084 — preset tema `modern` CSS-var** → hex nyata (ColorPicker/preview/landing valid).
6. ✅ **5 field tanpa UI dihapus dari form landing** (`hero_background_image`, `hero_background_overlay_opacity`, `theme_border_radius`, `theme_font_heading`, `theme_font_body`) — kolom DB dibiarkan; state `settings` dead + interface `LandingSettings` + `TRUST_ICON_MAP` tak terpakai dibersihkan.

### Laundry (migration 082)
7. ✅ **BUG-080 — task laundry tak bisa diterima** — check constraint `laundry_orders_status_check` di live tanpa `'in_progress'` → drop+recreate `('pending','in_progress','done','cancelled')` + sync schema.
8. ✅ **Generate payroll toast jelas** (Arah A) — payroll `paid` = final; task baru setelah dibayar masuk bulan berikutnya; toast: rate belum di-set / belum ada data / sukses / sudah lunas.
9. ✅ **Simulasi end-to-end laundry** (admin buat task+rate → terima → lapor selesai kg_actual → generate payroll → mark paid + jurnal) semua LULUS; data simulasi dibersihkan.

### Owner/Staff (BUG-085)
10. ✅ **`/owner/staff` kosong** — `order_logs(count)` ambigu (PGRST201, 2 FK) → `select('*')`; kolom Email dihapus (tidak ada di `public.users`); urutan role lengkap 8 role + badge label role/status; aksi "Kelola Staff" → `/admin/staff`.

### Docs
11. ✅ `AGENTS.md` — aturan `supabase-mcp-rules` (pakai MCP langsung, tanpa wajib CLI).
12. ✅ README (migration 072–083, riwayat sesi 19), `bug.md` (BUG-080–085), `todo.md`.

---

## ◐ Sedang (2026-08-13 — Sesi 18: Full E2E Test Suite per Role)

Plan komprehensif — menutup semua fitur user-facing per role agar tidak ada yang ketinggalan (laundry, surveyor, penjahit, HPP/BOM konsumsi material, input resi, input bayar, cancel/return, booking, dst). Jalankan: `npx playwright test --project=chromium`.

### Keputusan scope
- ✅ **Reset data**: cukup verifikasi render + modal konfirmasi 2 langkah (TIDAK jalankan reset beneran — menghapus data)
- ✅ **TikTok**: cukup test permukaan (tombol + error box), tanpa mock API eksternal
- ✅ Konvensi: reuse `helpers.ts` (`uid`/`expectToast`/`gotoDashboard`) + storage state `.auth/*.json` per role; `describe.serial` per spec

### File spec baru + cakupan (urutan prioritas)
| # | Spec | Cakupan |
|---|---|---|
| 1 | `tests/e2e/laundry.spec.ts` | Admin input task + set **rate/kg** → laundry **terima → lapor selesai + kg_actual** → finance **generate payroll + mark paid (jurnal)**; verifikasi = rate × kg_actual (regresi F-55) |
| 2 | `tests/e2e/surveyor.spec.ts` | Buat survey (client → **room** + foto + GPS + **tanda tangan**) → simpan → edit → **copy hasil / kirim WA / PDF** → **link ke order** |
| 3 | `tests/e2e/penjahit.spec.ts` | Job queue → **mulai** → **lapor selesai + meter** (gorden/vitras/roman/kupu²) → **auto-create steam_jobs** + order auto ke `steam`; verifikasi `production_reports` |
| 4 | `tests/e2e/hpp-bom-consume.spec.ts` | **HPP manual override** + setelah produksi verifikasi **material terkonsumsi** (`order_material_consumption`) + **stok berkurang** di `/gudang/stock` |
| 5 | `tests/e2e/shipping-resi.spec.ts` | Halaman **`/admin/shipping`**: tandai packed → **Input Resi modal** (kurir + resi + **wajib foto**) → shipped |
| 6 | `tests/e2e/finance-payments.spec.ts` | Finance **catat bayar** (DP/pelunasan + akun kas) + admin **tambah pembayaran** + finance **Proses Refund** (jalur pasca migration 080) |
| 7 | `tests/e2e/gudang.spec.ts` | Stock **mutasi/adjust/PO confirm**; **Steam FAIL**→re-queue; **QC fail**; **verifikasi retur** (good→stock in, damaged→dispose); **lembur**; **alerts→Buat PR**; **stock opname submit→finance approve** (stok berubah) |
| 8 | `tests/e2e/admin-ops.spec.ts` | Booking **accept/buat manual/batalkan**; **cancel order** (void + reversal, verifikasi tanpa jurnal hantu BUG-060); **return order**; **staff CRUD**; **PDF Invoice/PackingList/Faktur**; link survey |
| 9 | `tests/e2e/owner.spec.ts` | Supplier **PO flow** (create→Dikirim→Terima→Bayar, verifikasi stok masuk + jurnal hutang); **PriceHistoryTab** render; **reset render+modal**; **saldo awal** finance/settings (jurnal pembuka) |
| 10 | `tests/e2e/finance-ext.spec.ts` | **Cash transfer**; **aset CRUD**; **COA/mapping** render; **stock opname approve** |

### Baseline (sudah ada)
`smoke` (login 8 role + security + render) · `pipeline-kirim` (9 tahap) · `pipeline-pasang` (10 tahap) · `finance` (kas→piutang→jurnal→laporan) · `catalog-bom` (material→produk→HPP→katalog)

### Kerangka spec siap (dibuat sesi 18, TODO per blok)
- 10 spec baru dibuat sebagai kerangka valid + test render minimal per halaman kunci → suite langsung bisa dijalankan
- Isi detail per fitur sesuai tabel di atas (masing-masing blok diberi `// TODO sesi 18`)

### Verifikasi akhir
1. `npx tsc --noEmit` + `npm run build`
2. `npx playwright test --project=chromium` — seluruh suite hijau
3. Update `bug.md` untuk bug nyata yang ditemukan saat test (jangan fix dadakan — catat & laporkan)

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

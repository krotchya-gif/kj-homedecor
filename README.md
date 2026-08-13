# KJ Homedecor — Gorden & Curtain Management Platform

Sistem manajemen operasional lengkap untuk KJ Homedecor — spesialis gorden, curtain, roman blind premium. Dibangun dengan **Next.js 16 App Router** dan **Supabase**.

> 📖 **Panduan penggunaan per role (bahasa sederhana):** [`pendoman.md`](./pendoman.md)
> 🐞 **Riwayat bug & perbaikan:** [`bug.md`](./bug.md)
> 🔄 **Dokumentasi alur per modul:** [`docs/flows/`](./docs/flows/)

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **UI Components:** Shadcn-style custom (@base-ui/react) + komponen custom
- **Auth:** Supabase Auth + auth helpers (`src/lib/auth.ts`)
- **Proxy:** Next.js 16 `proxy.ts` — auth guard + role-based access + matcher
- **Payments:** Offline/manual + auto-catat DP (Xendit payment gateway sudah dihapus — tidak dipakai)
- **Marketplace:** TikTok Shop API (OAuth, sync order, sync finance, webhook) — settlement masuk akun **E Wallet Tiktok** (1104)
- **PDF:** jsPDF + autoTable (Invoice, Packing List, Survey, Laporan Keuangan)
- **Charts:** Recharts (Owner, Admin, Finance dashboards)
- **Image:** browser-image-compression + Supabase Storage
- **Validation:** Zod (API routes)
- **Deployment:** Vercel-ready

---

## Features

### Admin (`/admin`)
- Order management: filter status, create order (Kirim/Pasang), auto-catat DP
- Order detail: visual pipeline stepper, photo evidence per stage, invoice/packing list PDF
- **Jadwalkan Pasang** (1 langkah): pilih tanggal + installer langsung dari detail order
- Catalog management (products, categories, banners) — **harga jual di-set Owner via HPP**
- Customer database + WhatsApp integration
- Booking calendar + assign installer
- Portfolio, SEO, Landing settings (theme customization), Staff, Reports, Laundry
- **TikTok Shop** (`/admin/tiktok`): tarik order dari TikTok (**Sync Orders**) & jadikan pesanan utama (**Link to Main Orders**) — tugas admin; settlement/piutang di `/owner/tiktok`

### Finance (`/finance`)
- Payment tracking (DP → Lunas) + **Approve Cek Bayar** (verifikasi manual)
- Cash in/out/transfer/mutation (auto journal double-entry)
- Hutang (AP), Piutang (AR) per channel, refund
- Chart of Accounts + account mapping, Journal (manual + auto)
- Assets, Laundry Payroll
- **Laporan Keuangan (10 reports)** + PDF export — komponen shared `src/components/reports/*` (finance & owner pakai satu implementasi, beda label)

### Gudang (`/gudang`)
- Production job queue + BOM preview + material consumption otomatis
- Steam/QC jahitan: **Pass → order otomatis Siap** | Gagal → revisi ke penjahit
- QC per-item + **blok "📦 Siap Dikemas" → tombol Kemas**
- Stock: posisi gudang/toko, mutasi, edit stok (+/−/✎ dengan alasan), barang masuk
- Low stock alerts → 1-klik Purchase Request, Lembur, Retur verifikasi
- **Stock Opname** (`/gudang/stock-opname`): buat sesi, pilih material, input hitung fisik, selisih otomatis, kirim untuk verifikasi — **Finance approve** di `/finance/stock-opname` (selisih diterapkan ke stok + mutasi adjustment)

### Penjahit (`/penjahit`)
- Job queue realtime (postgres_changes), meter tracking
- Lapor selesai → order otomatis lanjut ke Steam/QC
- Monthly performance reports + work history

### Installer (`/installer`)
- Schedule realtime (hanya job yang ditugaskan padanya)
- Order Kirim: input resi (Dikemas → Terkirim); Order Pasang: Sedang Dipasang → Selesai
- Installation checklist + photo evidence, revision flow "Laporkan Masalah"

### Surveyor (`/surveyor`)
- Survey lapangan: info client, room-by-room (foto, ukuran cm, model, kain, rel, hook, catatan)
- Auto-save draft, GPS, notifikasi ke Admin/Owner, WhatsApp copy/kirim, PDF + tanda tangan
- Hanya melihat/edit survey milik sendiri (RLS)

### Laundry
- Role `laundry` dilayani lewat menu **Admin → Laundry**; gaji di **Finance → Laundry Payroll**

### Public Pages
- `/` — Landing page (hero, categories, products, portfolio, CTA, footer; konten + tema + trust badges dari DB)
- `/catalog` — Katalog publik (hanya produk dengan harga > 0)
- `/products/[slug]` — Detail produk (fallback "Harga: Hubungi via WhatsApp")
- `/booking` — Form booking publik (date + time slot)
- `/robots.txt` · `/sitemap.xml` — Dibaca dari DB (`landing_settings.robots_content`/`sitemap_content`), di-upload via Admin → SEO (persist saat redeploy)
- `/login` — Staff login (rate-limited)
- `/setup` — Bootstrap akun awal (owner/admin)

---

## Pipeline Pesanan

### Kirim (9 tahap)
```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terkirim → Selesai
```

### Pasang (10 tahap)
```
Baru → Cek Bayar → Sudah Disortir → Produksi → Steam/QC → Siap → Dikemas → Terjadwal Pasang → Sedang Dipasang → Selesai
```

### Tanggung jawab transisi (aktual, 2026-08-11)

| Transisi | Role | Lokasi |
|---|---|---|
| `new → payment_ok` | **finance** (approve cek bayar) | `/finance/payments` |
| `payment_ok → sorted` | gudang | halaman gudang / detail order |
| `sorted → production` | gudang (auto-create production_job) | detail order |
| `production → steam` | otomatis saat penjahit selesai | `/penjahit/jobs` |
| `steam → ready` | gudang klik Pass — **otomatis ke Siap** | `/gudang/steam` |
| `steam → production` (revisi) | gudang klik Gagal + foto + alasan | `/gudang/steam` |
| `ready → packed` | gudang tombol **Kemas** | `/gudang/qc` |
| `packed → shipped` | installer/admin (input resi + foto) | `/installer/schedule` / `/admin/shipping` |
| `packed → scheduled` | admin (modal: tanggal + installer → auto-create booking) | detail order |
| `scheduled → installing → done` | installer (RPC cascade ke orders) | `/installer/schedule`, `/installer/checklist` |

### Aturan
- **Payment gate:** `packed/shipped/done` wajib `payment_status='paid'` (belum lunas tidak bisa dikemas/dikirim/selesai)
- **Foto wajib:** sorted, steam, shipped (sorted/steam/shipped/scheduled dalam `PHOTO_REQUIRED_STAGES`)
- Admin/Owner = escape hatch (bisa semua transisi)
- Semua transisi tercatat di `order_logs` (audit trail)

---

## Alur Produk → HPP → Katalog (anti-ambigu)

```
1. Owner isi MATERIAL (nama, unit, harga beli)        /owner/materials
2. Admin buat PRODUK TANPA HARGA                       /admin/catalog/products
   → badge 🟠 "HPP belum dihitung", tersembunyi dari katalog publik
3. Owner hitung HPP (BOM material + markup) → Simpan   /owner/hpp
   → products.price ter-set, badge ✅ HPP
4. Produk otomatis muncul di katalog (filter price > 0)
```

---

## Project Structure

```
src/
├── proxy.ts                      # Next.js 16 proxy — auth guard + role-based access + matcher
├── app/
│   ├── page.tsx                  # Landing page (public)
│   ├── (auth)/login/             # Staff login
│   ├── setup/                    # Bootstrap akun awal
│   ├── (dashboard)/              # Protected dashboard group
│   │   ├── admin/                # Orders, catalog, booking, customers, staff, landing-settings, seo, shipping, laundry, portfolio, reports, surveys, tiktok
│   │   ├── finance/              # Payments, cash, hutang, piutang, accounts, journal, assets, laundry-payroll, laporan(10)
│   │   ├── gudang/               # Production, steam, qc, stock, stock-opname, alerts, lembur, reports
│   │   ├── penjahit/             # Jobs, reports, history
│   │   ├── installer/            # Schedule, checklist, reports
│   │   ├── surveyor/             # Survey new/[id]/edit, history
│   │   └── owner/                # Overview, hpp, materials, suppliers(3 tab), products, staff, marketplace, tiktok, surveys, laporan(10)
│   ├── catalog/                  # Public catalog
│   ├── products/[slug]/          # Public product detail
│   ├── booking/                  # Public booking
│   └── api/                      # 32 route handlers
│       ├── admin/create-staff/   # Staff creation (service role)
│       ├── orders/ [+[id], [id]/consume-materials]
│       ├── customers/ products/ materials/ suppliers/
│       ├── purchase-requests/ [+[id]]  purchase-orders/ [+[id]]
│       ├── install-bookings/ [+[id]]
│       ├── gudang/po-delivery/
│       ├── journal/ notifications/ surveys/ [+[id]]
│       ├── landing-settings/ seo/upload-robots/ seo/upload-sitemap/
│       ├── setup-accounts/ upload/
│       ├── tiktok/               # auth, webhook, sync-orders, sync-finance, sync-to-main-orders, create-piutang
│       └── webhooks/tiktok/      # Alias
├── components/
│   ├── ui/                       # button, card, dialog, modal, table, toast(sonner), Lightbox, BookingCalendar, DateRangePicker, StatCard, PageHeader, ImportModal, Pagination, dll
│   ├── dashboard/                # Sidebar, TopNav, NotificationBell, layout
│   ├── suppliers/                # PriceHistoryTab (tab Riwayat Harga di owner/suppliers)
│   └── landing/                  # ScrollNav, ProductCatalog, AnimatedCounter, HeroParticles, ScrollHero
├── config/                       # nav.tsx (navigasi per role — satu sumber)
├── lib/
│   ├── auth.ts                   # requireAuth, requireRole, requireAuthRole, checkRateLimit
│   ├── orders.ts                 # ORDER_STAGES_BY_CLASSIFICATION, PHOTO_REQUIRED_STAGES, getNextStage...
│   ├── invoice.ts                # Invoice & Packing List PDF
│   ├── survey.ts / survey-log.ts / survey-pdf.ts
│   ├── ledger.ts                 # fetchAccountBalances (journal_lines)
│   ├── csv.ts                    # export/import CSV
│   ├── upload.ts                 # uploadToLocal (compress → /api/upload)
│   ├── tiktok.ts                 # signTikTokRequest, token refresh
│   ├── upload.ts                 # uploadToLocal (compress → /api/upload)
│   └── (tiktok-shop-sdk dihapus 2026-08-13 — dead code, 1.971 file, 0 import; integrasi via tiktok.ts)
├── utils/supabase/
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # SSR client + createServiceClient
│   └── middleware.ts             # Proxy supabase client (request cookies)
└── types/index.ts                # TypeScript interfaces + STATUS_LABELS dll
```

---

## Database Migrations

Located in `supabase/migrations/` — referensi tunggal + sinkronisasi terbaru:

| File | Isi |
|---|---|
| `000_full_schema.sql` | **SATU-SATUNYA referensi schema** = kondisi live (58 tabel, 58 RLS, fungsi RPC, seed) — konsolidasi migration 001–071. Jangan baca migration lama per-file (lihat AGENTS.md) |
| `072_schema_sync_codebase.sql` | RLS hardening efektif (nama policy benar, ENABLE RLS tiktok/survey_logs, hardening accounts), `order_logs_action_check` + `payment_verified`, kolom drift codebase↔live |
| `073_tiktok_fee_breakdown.sql` | Kolom breakdown fee `tiktok_shop_statements` + `piutang.fee_amount` + unique index piutang tiktok |
| `074_cleanup_accounts_income.sql` | Cleanup `accounts.type='income'` → `'revenue'` + VALIDATE `accounts_type_check` |
| `075_approve_stock_opname.sql` | RPC `approve_stock_opname` — setujui sesi, terapkan selisih ke stok + mutasi adjustment |
| `076_piutang_invoice_unique.sql` | Unique `piutang.invoice_number` (anti double-faktur semua channel) |
| `077_e_wallet_tiktok_xendit_removal.sql` | Akun COA 1104 "Xendit Cash" → **E Wallet Tiktok** + row `cash_accounts`; mapping offline → Kas; `orders.scheduled_installation_time` |
| `078_rls_core_hardening.sql` | RLS role-based 5 tabel inti (orders/customers/materials/suppliers/install_bookings) + helper `is_staff_active_sd`/`is_installer_sd` |
| `079_reset_data_hardening.sql` | Rewrite `reset_transactional_data` (TRUNCATE 41 tabel + verifikasi), drop `seo_settings` |
| `080_cleanup_xendit_fix_payments_type.sql` | Drop kolom Xendit + fix `payments_type_check` tambah `'refund'` |
| `081_search_orders_rpc.sql` | RPC `search_orders` (search nama/resi/status/kategori di SQL) — BUG-079 |
| `082_fix_laundry_orders_status_check.sql` | Fix drift `laundry_orders_status_check` — tambah `'in_progress'` (live hanya pending/done/cancelled → terima task gagal) |
| `083_landing_settings_admin_only_seo_content.sql` | RLS `landing_settings` write → **hanya admin/owner**; kolom `robots_content`/`sitemap_content` (sitemap & robots disimpan di DB, bukan filesystem) |
| `084_tiktok_oauth_state_nonce.sql` | TikTok OAuth `state` = random nonce single-use (kolom `oauth_state`), bukan shop_id predictable |

> ⚠️ **Catatan:** migration lama `001–071` dihapus/dikonsolidasi ke `000_full_schema.sql`. Sebagian besar pengembangan berjalan langsung terhadap project hosted (`glblgsfenarnztawtpmu`) — verifikasi kondisi live via query read-only (service role) sebelum mengubah schema. Semua operasi DB bisa via **Supabase MCP** (lihat AGENTS.md — `supabase-mcp-rules`), tanpa wajib CLI.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Server-side only, never expose

# TikTok Shop
TIKTOK_APP_SECRET=                      # Webhook HMAC — WAJIB di-set (kalau kosong, verifikasi di-skip)
NEXT_PUBLIC_BASE_URL=                   # Dipakai OAuth callback TikTok
```

---

## Getting Started

```bash
npm install
npm run dev        # → http://localhost:3000
```

Build produksi:

```bash
npm run build
npm start
```

Test: `npm run test:run` (Vitest) / `npm run test:e2e` (Playwright) — **note:** konfigurasi mengarah ke `tests/` yang tidak ada di repo (belum disiapkan kembali).

---

## Implementasi & Riwayat Perbaikan

- **2026-08-13 — Sesi 31 (Phase 6B-3):** ekstrak section render order detail — `OrderPipelineStepper` & `OrderSurveySection`; page turun 2.923 → 2.749 baris (total −812 dari 3.561).
- **2026-08-13 — Sesi 30 (Phase 6B-2):** ekstrak 5 modal order detail ke `components/orders/` (Schedule, Photo, Cancel, Return, Payment) — page turun 3.561 → 2.923 baris (−638), behavior-preserving.
- **2026-08-13 — Sesi 29 (Phase 6B-1):** refactor monolit order detail langkah 1 — `LOG_ACTION` map & `DEFAULT_CHECKLIST` dipindah ke `lib/order-detail.ts` (`getOrderLogAction`), unit test +3 (27 total). Behavior-preserving.
- **2026-08-13 — Sesi 28 (Phase 6D):** notifikasi realtime — migration 085 aktifkan `notifications` di `supabase_realtime` publication; `NotificationBell` ganti polling 30s → `postgres_changes` (INSERT, filter user). Notifikasi baru muncul langsung.
- **2026-08-13 — Sesi 27 (Phase 6C):** dedup nav laporan keuangan — shared `components/reports/ReportsNav.tsx` (prop `basePath`), `finance/laporan` & `owner/laporan` jadi wrapper tipis (hapus copy-paste 10 kartu laporan).
- **2026-08-13 — Sesi 26 (Phase 6A):** hapus dead SDK `src/lib/tiktok-shop-sdk/` (1.971 file, 0 import) + dependensi `request`/`@types/request`. Proses anti-regresi: pindah → build hijau → hapus → build+test hijau. `tiktok-shop-sdk/` tidak lagi ada di project structure (integrasi TikTok via `lib/tiktok.ts`).
- **2026-08-13 — Plan Phase 6 (refactor & dead code):** rencana bertahap anti-regresi tertulis di `todo.md` — urutan: (6A) hapus dead SDK ✓ → (6C) dedup nav laporan finance/owner → (6D) notifikasi realtime → (6B) pecah monolit `admin/orders/[id]` 3.561 baris (4 sub-langkah, paling terakhir karena jalur kritis). Setiap milestone: build + test + cek halaman + commit kecil.
- **2026-08-13 — Sesi 24 (Phase 5 UI cepat):** pagination di admin/portfolio & admin/laundry; `theme_preset` → `custom` saat warna diedit manual; `handleSave` landing deteksi 0-rows (anti toast palsu); kredensial default dihapus dari setup page; karakter Cina korup di installer checklist diperbaiki.
- **2026-08-13 — Sesi 23 (Phase 4 akurasi laporan):** "Kronologi HPP" di-rename jadi **"Kronologi Omzet"** (nama jujur dgn isi) + pagination server-side; owner/marketplace akhir bulan dihitung dinamis (fix bulan 30 hari); helper `piutangSisa()` sebagai satu sumber kebenaran rumus piutang; admin/reports filter periode pindah ke server (tanpa `.limit(200)`). Metode mengikuti SOP `AGENTS.md`.
- **2026-08-13 — Sesi 22 (Phase 3 integritas akuntansi):** rollback jurnal diseragamkan pola BUG-073 di semua jalur finansial (refund/hutang/piutang/payroll/aset — jurnal gagal = transaksi dibatalkan penuh); hardcoded UUID akun diganti helper `getAccountIdByCode` (lookup by code, anti-drift); `accounts/accounts` pakai `fetchAccountBalances` (hapus double-count saldo + field "Saldo Awal" COA); PO paid di owner/suppliers kini bikin jurnal `hutang_paid` idempotent; `markAsPaid` payroll + idempotency_key. Metode mengikuti SOP `AGENTS.md`.
- **2026-08-13 — Sesi 21 (Phase 2 hardening API):** rate limit diterapkan di 9 route sensitif (`upload`, `create-staff`, SEO upload, TikTok auth/sync); `create-staff` — cek status active, password min 8, anti email-enumeration, role `laundry` ditambahkan ke enum & UI; TikTok OAuth `state` → random nonce single-use (migration 084). Metode mengikuti SOP di `AGENTS.md`.
- **2026-08-13 — Sesi 20 (Phase 1 keamanan):** PII exposure ditutup — GET `orders/[id]`, `install-bookings` (+[id]), `materials`, `suppliers`, `purchase-*` di-role-gate server-side; cek `status='active'` di purchase-orders/po-delivery; fail-open `role ?? 'admin'` di client (login/layout/survey) → fail-closed. Tambah SOP Bug-Fix di `AGENTS.md` (root cause → live DB → role-gate server → verifikasi user-level → sync doc per fase).
- **2026-08-13 — Sesi 19:** landing settings & SEO — RLS `landing_settings` write hanya admin/owner (migration 083); sitemap & robots kini disimpan di DB (`robots_content`/`sitemap_content`) + route `/robots.txt` & `/sitemap.xml` baca dari DB (persist saat redeploy); trust badges tampil di hero landing; preset tema `modern` diperbaiki (hex, bukan CSS-var); 5 field tanpa UI dihapus dari form landing; fix drift `laundry_orders_status_check` (migration 082 — task laundry bisa diterima); generate payroll diberi toast jelas (payroll paid = final, task baru masuk bulan berikutnya); `/owner/staff` — kolom Email dihapus (tidak ada di `public.users`), urutan role rapi, badge label
- **2026-08-13 — Sesi 18:** fix BUG-079 search pesanan via RPC `search_orders` (migration 081); kerangka 10 spec E2E per role (37/37 render pass)
- **2026-08-13 — Sesi 17:** search & sort pesanan server-side; BUG-078 landing theme/konten dari DB (merge kolom+value JSON); SEO meta dari DB (`generateMetadata`)
- **2026-08-12 — Sesi 3–6:** schema = live (072-074), RLS hardening efektif, TikTok fee terjurnal penuh, security API (fail-open/mass-assignment/webhook), route POST role-gate, upload scope, tests unit (16), nav & laporan dedup, stock opname UI
- **2026-08-11 — Pipeline fix (BUG-001/002/003/007):** Steam Pass auto-advance ke Siap; tombol Kemas di gudang; admin escape hatch; prefill foto; modal Jadwalkan Pasang + auto-create booking installer
- **2026-08-11 — BUG-004:** DP admin auto-catat ke tabel payments; approve finance = verifikasi final (cek bayar terakhir di Finance)
- **2026-08-11 — BUG-008:** harga jual bukan tanggung jawab admin — di-set Owner via HPP; produk tanpa harga tersembunyi dari katalog
- **2026-08-11 — Docs:** `pendoman.md` (panduan per role), `bug.md`, `docs/flows/` disinkronkan dengan kode
- **2026-07-18 — Audit & proxy migration:** `middleware.ts` → `proxy.ts`, auth helpers, rate limiting, RLS migrations 053-058
- **2026-06-02 — Pipeline V2:** payment_ok di depan, steam revision loop, 3 QC distinct

> 🔒 **Keamanan (terbaru 2026-08-13):** RLS `landing_settings` admin/owner-only; GET API yang membawa PII (`orders/[id]`, `install-bookings*`, `materials`, `suppliers`, `purchase-*`) di-role-gate; fail-open `role ?? 'admin'` di client ditutup (fail-closed); rate limit di 9 route sensitif (upload, create-staff, SEO, TikTok sync); create-staff diperkuat (status active, password min 8, anti-enumeration); TikTok OAuth state = random nonce (migration 084). Lihat `bug.md` & backlog `todo.md`. Test unit: `npm run test:run` (Vitest, `tests/unit`).

---

_Last updated: 2026-08-13 · Dev server: `npm run dev` → http://localhost:3000_

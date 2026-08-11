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
- **Payments:** Xendit API (VA/QRIS) dengan HMAC webhook verification
- **Marketplace:** TikTok Shop API (OAuth, sync order, sync finance, webhook)
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

### Finance (`/finance`)
- Payment tracking (DP → Lunas) + **Approve Cek Bayar** (verifikasi manual)
- Cash in/out/transfer/mutation (auto journal double-entry)
- Hutang (AP), Piutang (AR) per channel, refund
- Chart of Accounts + account mapping, Journal (manual + auto)
- Assets, Laundry Payroll
- **Laporan Keuangan (10 reports)** + PDF export

### Gudang (`/gudang`)
- Production job queue + BOM preview + material consumption otomatis
- Steam/QC jahitan: **Pass → order otomatis Siap** | Gagal → revisi ke penjahit
- QC per-item + **blok "📦 Siap Dikemas" → tombol Kemas**
- Stock: posisi gudang/toko, mutasi, edit stok (+/−/✎ dengan alasan), barang masuk
- Low stock alerts → 1-klik Purchase Request, Lembur, Stock Opname, Retur verifikasi

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
- `/` — Landing page (hero, categories, products, portfolio, CTA, footer)
- `/catalog` — Katalog publik (hanya produk dengan harga > 0)
- `/products/[slug]` — Detail produk (fallback "Harga: Hubungi via WhatsApp")
- `/booking` — Form booking publik (date + time slot)
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
│   │   ├── admin/                # Orders, catalog, booking, customers, staff, landing-settings, seo, shipping, laundry, portfolio, reports, surveys
│   │   ├── finance/              # Payments, cash, hutang, piutang, accounts, journal, assets, laundry-payroll, laporan(10)
│   │   ├── gudang/               # Production, steam, qc, stock, alerts, lembur, reports
│   │   ├── penjahit/             # Jobs, reports, history
│   │   ├── installer/            # Schedule, checklist, reports
│   │   ├── surveyor/             # Survey new/[id]/edit, history
│   │   └── owner/                # Overview, hpp, materials, suppliers, products, staff, marketplace, tiktok, surveys, laporan(10)
│   ├── catalog/                  # Public catalog
│   ├── products/[slug]/          # Public product detail
│   ├── booking/                  # Public booking
│   └── api/                      # 34 route handlers
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
│       ├── xendit/               # create-payment + webhook (HMAC)
│       └── webhooks/tiktok/      # Alias
├── components/
│   ├── ui/                       # button, card, dialog, modal, table, toast(sonner), Lightbox, BookingCalendar, DateRangePicker, StatCard, PageHeader, ImportModal, dll
│   ├── dashboard/                # Sidebar, TopNav, NotificationBell, layout
│   └── landing/                  # ScrollNav, ProductCatalog, AnimatedCounter, HeroParticles, ScrollHero
├── config/                       # (kosong — navigation.tsx dihapus saat merge)
├── lib/
│   ├── auth.ts                   # requireAuth, requireRole, requireAuthRole, checkRateLimit
│   ├── orders.ts                 # ORDER_STAGES_BY_CLASSIFICATION, PHOTO_REQUIRED_STAGES, getNextStage...
│   ├── invoice.ts                # Invoice & Packing List PDF
│   ├── survey.ts / survey-log.ts / survey-pdf.ts
│   ├── ledger.ts                 # fetchAccountBalances (journal_lines)
│   ├── csv.ts                    # export/import CSV
│   ├── upload.ts                 # uploadToLocal (compress → /api/upload)
│   ├── tiktok.ts                 # signTikTokRequest, token refresh
│   └── tiktok-shop-sdk/          # Auto-generated TikTok Shop SDK
├── utils/supabase/
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # SSR client + createServiceClient
│   └── middleware.ts             # Proxy supabase client (request cookies)
└── types/index.ts                # TypeScript interfaces + STATUS_LABELS dll
```

---

## Database Migrations

Located in `supabase/migrations/` — **71 file** (000 → 062, 900). Ringkasan per domain:

| Domain | Migration | Isi |
|---|---|---|
| Core | `001` | users, orders, order_items, customers, products, categories, materials, suppliers, BOM, production_jobs, payments, order_logs, low_stock_alerts, inventory_movements, install_bookings, install_checklists, lembur_records, banners, portfolio_posts, returns, qc_records, style_rates, laundry_records |
| Stock | `028, 044` | RPC increment/decrement stock (NUMERIC + GREATEST(0) guard) |
| Pipeline | `032, 034, 035, 041, 042, 051, 061` | progress photos, revisi booking, estimated_completion, reset pipeline, steam revision loop, order_material_consumption, advance_install_booking_status |
| Finance | `018-026, 033, 043` | accounts, mapping, journal, hutang, piutang, cash, assets, material_price_history, xendit idempotency |
| Survey | `060, 061, 062` | surveys, survey_rooms, survey_room_photos, survey_logs + role surveyor |
| TikTok | `053` | tiktok_shop_settings/orders/statements |
| Laundry | `011, 047, 054` | laundry_orders/rates/payroll, role laundry |
| Security/RLS | `053-058, 059` | RLS fixes, FK indexes, anon revoke |

> ⚠️ **Catatan penting:** beberapa migration `054_fix`, `055`, `057`, `058`, `900` ditulis terhadap skema production dan **tidak bisa dijalankan dari nol** (referensikan kolom yang tidak ada di chain). Sebagian besar pengembangan berjalan langsung terhadap project hosted (`glblgsfenarnztawtpmu`).

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Server-side only, never expose

# Xendit
XENDIT_API_KEY=
XENDIT_CALLBACK_KEY=

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

- **2026-08-11 — Pipeline fix (BUG-001/002/003/007):** Steam Pass auto-advance ke Siap; tombol Kemas di gudang; admin escape hatch; prefill foto; modal Jadwalkan Pasang + auto-create booking installer
- **2026-08-11 — BUG-004:** DP admin auto-catat ke tabel payments; approve finance = verifikasi final (cek bayar terakhir di Finance)
- **2026-08-11 — BUG-008:** harga jual bukan tanggung jawab admin — di-set Owner via HPP; produk tanpa harga tersembunyi dari katalog
- **2026-08-11 — Docs:** `pendoman.md` (panduan per role), `bug.md`, `docs/flows/` disinkronkan dengan kode
- **2026-07-18 — Audit & proxy migration:** `middleware.ts` → `proxy.ts`, auth helpers, rate limiting, RLS migrations 053-058
- **2026-06-02 — Pipeline V2:** payment_ok di depan, steam revision loop, 3 QC distinct

> 🔒 **Keamanan tersisa (dari audit 2026-08-11):** beberapa API route masih hanya cek login (tanpa role check): `purchase-orders`, `gudang/po-delivery`, `seo/upload-*`, `surveys/[id]`, `create-staff` (fail-open). Lihat `bug.md` + rencana Fase 1.

---

_Last updated: 2026-08-11 · Dev server: `npm run dev` → http://localhost:3000_

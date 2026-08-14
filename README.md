# KJ Homedecor — Gorden & Curtain Management Platform

Sistem manajemen operasional lengkap untuk KJ Homedecor — spesialis gorden, curtain, roman blind premium. Dibangun dengan **Next.js 16 App Router** dan **Supabase**.

> 📖 **Panduan penggunaan per role (bahasa sederhana):** [`pendoman.md`](./pendoman.md)
> 🐞 **Riwayat perbaikan, bug tracker & audit:** [`docs/riwayat.md`](./docs/riwayat.md)
> 🔄 **Dokumentasi alur per modul:** [`docs/flows/`](./docs/flows/)

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **UI Components:** Shadcn-style custom (@base-ui/react) + komponen custom
- **Auth:** Supabase Auth + auth helpers (`src/lib/auth.ts`)
- **Proxy:** Next.js 16 `proxy.ts` — auth guard + role-based access + matcher
- **Payments:** Offline/manual + auto-catat DP (Xendit payment gateway sudah dihapus — tidak dipakai)
- **Marketplace:** TikTok Shop API (OAuth, sync order, sync finance, webhook) — settlement masuk akun **E Wallet Tiktok** (1104)
- **PDF:** jsPDF + autoTable (Invoice, Packing List, Survey, Laporan Keuangan)
- **Charts:** Recharts (Owner, Admin, Finance dashboards)
- **Image:** browser-image-compression + CDN `link.kjhomedecor.com` (upload via `/api/upload` → `upload.php`)
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
│   └── api/                      # 22 route handlers (dead route dihapus 086 — UI via Supabase client)
│       ├── admin/create-staff/   # Staff creation (service role)
│       ├── orders/ [+[id], [id]/consume-materials]
│       ├── install-bookings/[id] # Status booking → RPC advance_install_booking_status
│       ├── gudang/po-delivery/
│       ├── journal/ notifications/ surveys/ [+[id]]
│       ├── seo/upload-robots/ seo/upload-sitemap/
│       ├── setup-accounts/ upload/
│       ├── tiktok/               # auth, auth/reauthorize, webhook, sync-orders, sync-finance, sync-to-main-orders, create-piutang
│       └── webhooks/tiktok/      # Alias
├── components/
│   ├── ui/                       # button, card, dialog, modal, table, toast(sonner), Lightbox, BookingCalendar, DateRangePicker, StatCard, PageHeader, ImportModal, Pagination, dll
│   ├── dashboard/                # Sidebar, TopNav, NotificationBell, layout
│   ├── orders/                   # Komponen order detail (Schedule/Photo/Cancel/Return/Payment Modal, PipelineStepper, OrderSummary, OrderItems, AddItemModal, dsb)
│   ├── reports/                  # Laporan keuangan (10) + ReportsNav (finance & owner shared)
│   ├── suppliers/                # PriceHistoryTab (tab Riwayat Harga di owner/suppliers)
│   └── landing/                  # ScrollNav, ProductCatalog, AnimatedCounter, HeroParticles, ScrollHero
├── config/                       # nav.tsx (navigasi per role — satu sumber) + accounts.ts (getAccountIdByCode)
├── lib/
│   ├── auth.ts                   # requireAuth, requireRole, requireAuthRole, checkRateLimit
│   ├── orders.ts                 # ORDER_STAGES_BY_CLASSIFICATION, PHOTO_REQUIRED_STAGES, getNextStage...
│   ├── order-detail.ts           # LOG_ACTION, ROLE_NEXT_ALLOWED, canRoleAdvanceNext, parseGordenMeter...
│   ├── use-order-detail.ts       # Hook order detail (semua state & handlers — refactor 6B)
│   ├── invoice.ts                # Invoice & Packing List PDF
│   ├── survey.ts / survey-log.ts / survey-pdf.ts
│   ├── ledger.ts                 # fetchAccountBalances (journal_lines) + piutangSisa
│   ├── csv.ts                    # export/import CSV
│   ├── upload.ts                 # uploadToLocal (compress → /api/upload → CDN link.kjhomedecor.com)
│   └── tiktok.ts                 # signTikTokRequest, token refresh
├── utils/supabase/
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # SSR client + createServiceClient
│   └── middleware.ts             # Proxy supabase client (request cookies)
├── scripts/
│   └── upload.php                # Upload handler utk subdomain link.kjhomedecor.com — copy ke public_html/link/upload.php (folder 'survey' + magic video)
└── types/index.ts                # TypeScript interfaces + STATUS_LABELS dll
```

---

## Database Migrations

### Di repo GitHub (yang di-push)
| File | Isi |
|---|---|
| `000_full_schema.sql` | **SATU-SATUNYA referensi schema** = kondisi live (54 tabel, RLS, fungsi RPC, seed) — konsolidasi seluruh migration 001–088 + seed. Satu-satunya file yang di-push (keputusan 2026-08-13); migration per-file `001–071`/`072–088`/`900` tetap di disk lokal, di-ignore `.gitignore` |

> ⚠️ **Catatan:** migration per-file (`001–071`, `072–088`, `900`) **tidak di-push** — hanya `000_full_schema.sql` yang di-push dan dijadikan referensi (sudah include init + seed yang sama dengan live DB). File per-file tetap ada di lokal untuk konteks. Sebagian besar pengembangan berjalan langsung terhadap project hosted (`glblgsfenarnztawtpmu`) — verifikasi kondisi live via query read-only (service role) sebelum mengubah schema. Semua operasi DB bisa via **Supabase MCP** (lihat AGENTS.md — `supabase-mcp-rules`), tanpa wajib CLI.

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

> 📁 **Upload file** (`/api/upload`) diteruskan ke CDN `link.kjhomedecor.com/upload.php` (const `CDN_UPLOAD_URL` di `src/app/api/upload/route.ts`) — file tersimpan permanen sebagai file asli di `public_html/link/uploads/{folder}/`, tidak terpengaruh redeploy. Bukan Supabase Storage (bucket `kj-uploads` tidak dipakai lagi). File PHP upload handler: `scripts/upload.php` (copy ke Hostinger).

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

Test: `npm run test:run` (Vitest — unit tests di `tests/unit`) / `npm run test:e2e` (Playwright — `tests/e2e`, perlu dev server; auth storage `.auth/*.json`).

---

## Implementasi & Riwayat Perbaikan

> Riwayat per-fase (Sesi 1–52), tracker bug lengkap **BUG-001 s/d BUG-131**, audit modul finance, dan backlog tersedia di **[`docs/riwayat.md`](./docs/riwayat.md)**.

---

_Last updated: 2026-08-15 (sesi 52 — audit 3 wave + BUG-131 proxy brand asset: font & logo CDN tanpa CORS kini via /api/brand-asset) · Dev server: `npm run dev` → http://localhost:3000_

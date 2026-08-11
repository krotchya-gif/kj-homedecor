# KJ Homedecor — Gorden & Curtain Management Platform

Sistem manajemen operasional lengkap untuk KJ Homedecor — spesialis gorden, curtain, roman blind premium. Dibangun dengan Next.js 16 App Router dan Supabase.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **UI Components:** Shadcn/ui (@base-ui/react) + custom components
- **Auth:** Supabase Auth + custom auth helpers (`src/lib/auth.ts`)
- **Proxy:** Next.js 16 `proxy.ts` for auth guard, role-based access, and pathname headers
- **Payments:** Xendit API (VA/QRIS) with HMAC webhook verification
- **PDF:** jsPDF + autoTable (Invoice & Packing List)
- **Charts:** Recharts (Owner, Admin, Finance dashboards)
- **Image Compression:** browser-image-compression
- **Deployment:** Vercel-ready

---

## Features

### Admin (`/admin`)

- Order management dengan filter by status + create order (Kirim/Pasang)
- V3 Pipeline branching: alur **kirim** (8 stage) vs **pasang** (9 stage, auto-create booking)
- Order detail dengan visual pipeline, photo upload per status, BOM auto-suggest
- Role-based status transitions + payment gate (`packed/shipped/done` requires `paid`)
- Invoice PDF + Packing List PDF generation
- Pipeline ETA (Estimasi Selesai per order)
- Catalog management (products, categories, banners)
- Customer database with WhatsApp integration + edit capability
- Booking calendar (admin + public `/booking`)
- Portfolio/inspiration blog posts
- Sales reports dengan MoM growth indicators
- Shipping workflow (resi + courier)
- SEO management + Landing page settings (theme customization)
- Staff account creation
- Real-time admin dashboard (8 stat cards + bar/line charts)

### Owner (`/owner`)

- Real-time dashboard: today's new orders + active installations
- 12-month revenue trend chart (polished Recharts: gradient, animasi, donut)
- Marketplace breakdown (bar + pie charts)
- Top products by revenue
- HPP Calculator (BOM-based)
- Material price history tracking
- **Laporan Keuangan (10 reports)** — Neraca, Laba Rugi, Buku Besar, Daftar Jurnal, Mutasi Kas, Kronologi HPP, Neraca Saldo, Performa Tag, Umur Piutang, Umur Hutang
- Staff, suppliers, products overview

### Finance (`/finance`)

- BOM & Material cost management
- HPP Calculator with auto/manual modes
- Payment tracking (DP → Lunas) with approval gate
- Hutang (accounts payable) management + supplier invoice tracking
- Piutang (accounts receivable) management per channel
- Chart of Accounts + account mapping
- Journal entries (manual + auto)
- Cash & Bank management
- Asset management
- Laundry payroll
- **Laporan Keuangan (10 reports)** with DateRangePicker + PDF export
- Finance dashboard: monthly revenue bar chart + payment status donut chart

### Gudang (`/gudang`)

- Production job queue dengan **BOM preview** material sebelum mulai kerja
- **Block "Mulai" kalau BOM material insufficient** — modal warning + opsi tetap lanjut
- Steam QC (jahitan penjahit) + revision loop auto re-queue
- QC per-item checklist (`order_items.ready`)
- Stock position dengan tab: Material, Produk, Barang Masuk, Edit Stok
- **Edit Stok**: tombol [+][−][✎] per row — quick adjust + edit modal dengan alasan
- **📦 Pesanan Datang**: list PO delivered — Gudang konfirmasi receipt
- Low stock alerts with 1-click PR creation
- Lembur (overtime) logging
- Stock Opname: buat sesi → hitung fisik → Owner approve → adjustment otomatis

### Penjahit (`/penjahit`)

- Job queue dengan meter tracking
- Monthly performance reports
- Work history
- Realtime subscriptions for new jobs

### Installer (`/installer`)

- Schedule with status (Terjadwal/Dikerjakan/Selesai)
- Installation checklist with photo evidence
- Revision flow: "Laporkan Masalah" at location
- Reports per period

### Public Pages

- `/` — Landing page with hero, categories, products, portfolio
- `/catalog` — Full product catalog with search
- `/products/[slug]` — Product detail
- `/booking` — Public booking form (date + time slot picker + BookingCalendar)
- `/login` — Staff login (rate-limited: 5 attempts → 5 min lockout)

---

## Security

- **Proxy** (`src/proxy.ts`): Auth guard for all dashboard routes + role-based access control + `x-pathname` header
- **Auth helpers** (`src/lib/auth.ts`): `requireAuth()`, `requireRole()`, `requireAuthRole()`, `checkRateLimit()`
- **Rate limiting**: In-memory per-IP limiter on all POST/PUT/DELETE endpoints
- **Mass assignment protection**: Whitelist field approach on all mutation endpoints
- **IDOR protection**: Role-based and ownership-based filtering on data access
- **Input validation**: Zod schemas on all creation endpoints
- **File upload**: MIME type + magic bytes + extension validation
- **Xendit webhook**: HMAC-SHA256 timing-safe verification
- **RLS policies**: 6 migration files (053-058) fixing RLS gaps

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (public)
│   ├── (auth)/login/              # Staff login
│   ├── (dashboard)/               # Protected dashboard group
│   │   ├── admin/                 # Orders, catalog, customers, booking, reports
│   │   ├── finance/               # Payments, hutang, piutang, accounts, journal, laporan
│   │   ├── gudang/                # Production, steam, stock, alerts, QC, lembur
│   │   ├── penjahit/              # Jobs, reports, history
│   │   ├── installer/             # Schedule, checklist, reports
│   │   ├── laundry/               # Laundry jobs
│   │   └── owner/                 # Overview, HPP, suppliers, materials, laporan
│   ├── catalog/                   # Public catalog
│   ├── booking/                   # Public booking
│   ├── products/[slug]/           # Public product detail
│   └── api/
│       ├── admin/create-staff/    # Staff creation (service role)
│       ├── orders/                # Order CRUD + consume-materials
│       ├── customers/             # Customer CRUD
│       ├── products/              # Product CRUD
│       ├── materials/             # Material CRUD
│       ├── suppliers/             # Supplier CRUD
│       ├── purchase-requests/     # PR CRUD
│       ├── purchase-orders/       # PO CRUD
│       ├── install-bookings/      # Install booking CRUD + RPC advance
│       ├── gudang/po-delivery/    # Gudang PO receipt confirmation
│       ├── journal/               # Journal entries
│       ├── landing-settings/      # Landing page config
│       ├── seo/upload-*           # SEO file upload (robots.txt, sitemap.xml)
│       ├── setup-accounts/        # Initial admin/owner setup (protected)
│       ├── upload/                # File upload (MIME + magic bytes + extension validated)
│       ├── xendit/                # Create payment + webhook (HMAC verified)
│       └── webhooks/xendit/       # Xendit payment webhook
├── components/
│   ├── ui/                        # Shadcn/ui + custom components
│   │   ├── button, card, table, input, dialog, badgebadge, select, skeleton
│   │   ├── Lightbox, Toast, ThemeToggle, BookingCalendar, DateRangePicker
│   │   └── ReportPDFButton, BackButton, EmptyState, ColorPicker
│   ├── dashboard/                 # Sidebar, TopNav, layout components
│   └── landing/                   # Landing page components (ProductCatalog, ScrollNav)
├── config/
│   └── navigation.tsx             # Shared NAV_BY_ROLE + ROLE_LABELS
├── lib/
│   ├── auth.ts                    # Auth helpers + rate limiter
│   ├── invoice.ts                 # Invoice & Packing List PDF
│   ├── orders.ts                  # Pipeline V3 shared utilities
│   ├── upload.ts                  # File upload helper
│   └── utils.ts                   # cn(), formatRp(), generateOrderNumber()
├── utils/supabase/
│   ├── client.ts                  # Browser client
│   ├── server.ts                  # SSR client
│   └── middleware.ts              # Supabase middleware client (for proxy.ts)
├── types/index.ts                 # TypeScript interfaces
├── proxy.ts                       # Next.js 16 proxy (auth + role guard + headers)
└── middleware.ts (deleted)        # Renamed to proxy.ts
```

---

## Database Migrations

Located in `supabase/migrations/` — apply in order:

| File                                            | Description                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `001_initial_schema.sql`                        | Core tables: users, orders, customers, products, materials, suppliers, BOM, production_jobs, payments, order_logs |
| `015_order_number.sql`                          | order_number column + generate_order_number() function                                                            |
| `028_increment_stock_toko_function.sql`         | RPC functions: increment/decrement stock_gudang                                                                   |
| `032_order_progress_photos.sql`                 | order_progress_photos table for pipeline photo tracking                                                           |
| `033_material_price_history.sql`                | material_price_history table for price tracking                                                                   |
| `034_install_bookings_revision.sql`             | revision_reason + revision_photos on install_bookings                                                             |
| `035_orders_estimated_completion.sql`           | estimated_completion column on orders                                                                             |
| `037_enable_steam_jobs_rls.sql`                 | RLS policy for steam_jobs                                                                                         |
| `038_enable_rls_order_progress_photos.sql`      | RLS policy for order_progress_photos                                                                              |
| `039_add_product_id_to_inventory_movements.sql` | Add product_id column to inventory_movements (idempotent)                                                         |
| `040_stock_opname_schema.sql`                   | stock_opname_sessions + stock_opname_items tables + RLS                                                           |
| `041_reset_pipeline_to_sorted.sql`              | Reset order existing ke status `sorted` (clean slate setelah pipeline refactor)                                   |
| `042_steam_revision_schema.sql`                 | `production_jobs.revision_of` + `revision_round` + `revision_reason` (Steam revision loop)                        |
| `043_payments_xendit_id.sql`                    | `payments.xendit_payment_id` + partial unique index (Xendit webhook idempotency)                                  |
| `044_stock_rpc_numeric.sql`                     | Recreate stock RPCs (`decrement_stock_gudang`, dll) dengan `NUMERIC` + `GREATEST(0)` guard                        |

---

## Changelog (Latest)

**Brand Color:** `#cc7030` (warm brown/orange)

**Light Mode:**

| Usage          | Color     |
| -------------- | --------- |
| Primary button | `#cc7030` |
| Background     | `#fafafa` |
| Card/Surface   | `#ffffff` |
| Text heading   | `#1f2937` |
| Text muted     | `#6b7280` |

**Dark Mode:** Warm dark palette in `globals.css` (`.dark` class on `<html>`)

---

## Key Files

| File                                               | Purpose                                         |
| -------------------------------------------------- | ----------------------------------------------- |
| `src/lib/invoice.ts`                               | Invoice & Packing List PDF generation           |
| `src/lib/upload.ts`                                | Local upload helper (`uploadToLocal`)           |
| `src/components/ui/DateRangePicker.tsx`            | Interactive calendar popup date range picker    |
| `src/components/ui/ReportPDFButton.tsx`            | Styled PDF download button                      |
| `src/components/ui/BackButton.tsx`                 | Navigation back button                          |
| `src/components/ErrorBoundary.tsx`                 | React ErrorBoundary for graceful error handling |
| `src/components/ui/ThemeToggle.tsx`                | Dark mode toggle                                |
| `src/components/ui/BookingCalendar.tsx`            | Public booking calendar                         |
| `src/components/ui/skeleton.tsx`                   | Loading skeletons                               |
| `src/components/ui/EmptyState.tsx`                 | Empty state component                           |
| `src/components/dashboard/DashboardSidebar.tsx`    | Sidebar navigation                              |
| `src/app/api/gudang/po-delivery/route.ts`          | Gudang PO delivery confirmation API             |
| `src/app/(dashboard)/gudang/stock/opname/page.tsx` | Stock opname page                               |

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Server-side only, never expose
XENDIT_API_KEY=                     # Xendit payment integration
```

---

## Getting Started

```bash
npm install
npm run dev
```

Apply migrations to Supabase before running:

```bash
supabase db push
```

---

## Implementation Status

**Phase 1-5 Complete ✅**

All planned features implemented:

- [x] Order pipeline with photo tracking
- [x] BOM + HPP calculator
- [x] Payment gate (DP/Lunas approval)
- [x] Installer revision flow
- [x] Invoice/Packing List PDF
- [x] MoM growth reports
- [x] Real-time owner dashboard
- [x] Material price history
- [x] Public booking calendar
- [x] Dark mode, PWA, ErrorBoundary
- [x] Laporan Keuangan (10 reports each for Finance + Owner with DateRangePicker + PDF export)
- [x] Pipeline progress photos — clickable stages showing photo evidence
- [x] Auto transition production→steam when penjahit completes job
- [x] Gudang BOM preview panel before starting production
- [x] Block "Mulai" if BOM materials insufficient
- [x] Stock Opname (create session → count → approve → adjust)
- [x] Edit Stok with [+][−] quick buttons + edit modal with reason tracking
- [x] PO delivery confirmation flow: pending→delivered→received (Gudang confirms)
- [x] Realtime subscriptions on penjahit jobs, installer schedule, steam_jobs

**Marketplace Sync:** Ditunda (requires partnership)

---

## 🆕 Pipeline V2 Refactor (2026-06-02)

### Order Pipeline Baru

```
new → sorted → production → steam → ready → payment_ok → packed → shipped → done
                                          ^^^^^^^^^^^^
                                          payment_ok = FINANCE cek lunas (sebelum packing)
```

**Perubahan kunci:**

- `payment_ok` dipindah dari sebelum `production` ke antara `ready` dan `packed`
- Xendit/marketplace: auto-paid, skip `payment_ok` (langsung lanjut packed)
- Offline order: stuck di `ready` → Finance verify → `payment_ok` → Gudang packing

### Steam Revision Loop (Bug #6 Fix)

Steam QC fail → re-queue ke Penjahit dengan `revision_round++`:

- Tabel `production_jobs` tambah `revision_of`, `revision_round`, `revision_reason`
- Original job tetap `done` (audit trail), new job dengan `status='waiting'`
- `penjahit_id` dipreserve (tanggung jawab kembali ke Penjahit yang sama)
- `order.status` kembali ke `production` → loop sampai pass

### 3 QC Distinct di Gudang

| Lokasi                      | Tanggung Jawab                           | Affects Pipeline?                      |
| --------------------------- | ---------------------------------------- | -------------------------------------- |
| `/gudang/steam` (tab Steam) | QC jahitan penjahit                      | ✅ YES (loops ke production jika fail) |
| `/gudang/qc` (tab QC)       | Per-item checklist (`order_items.ready`) | ✅ YES (set ready)                     |
| `/gudang/qc` (tab Retur)    | Verifikasi retur customer                | ❌ NO (stock adjustment only)          |

### Role Permissions (Updated)

| Role            | Allowed Transitions                               |
| --------------- | ------------------------------------------------- |
| `finance`       | `ready→payment_ok`, `payment_ok→packed`           |
| `gudang`        | `production→steam`, `steam→production` (revision) |
| `installer`     | `packed→shipped`                                  |
| `admin`/`owner` | All transitions (escape hatch)                    |

### Payment Gate (Updated)

- Old: `ready, packed, shipped, done` butuh `payment_status='paid'`
- New: hanya `packed, shipped, done` yang digate (sesuai pipeline baru)

### Stat Cards Baru

- **Admin**: "Sudah Bayar Belum Disortir" (paid + new/sorted)
- **Finance**: "Butuh Verifikasi Bayar" (status=ready, total piutang)

---

## 🆕 Critical Bug Fixes (2026-06-02)

| Bug                                                                              | Severity    | Fix                                             |
| -------------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| #1 Xendit webhook idempotency (insert before update, unique `xendit_payment_id`) | 🔴 CRITICAL | Migration 043 + webhook rewrite                 |
| #2-3 Stok negatif + RPC NUMERIC vs INTEGER mismatch                              | 🔴 CRITICAL | Migration 044 (NUMERIC + GREATEST(0) guard)     |
| #4 E2E test `describe` import broken (10 files)                                  | 🔴 CRITICAL | 10 e2e test files: `describe` → `test.describe` |
| #5 DELETE order no role check                                                    | 🟠 HIGH     | API: admin/owner only + audit log               |
| #12 Typo `!material` di production page                                          | 🟡 MEDIUM   | Fixed to `! Material`                           |

**Tests:** 21/21 unit (Vitest) + 116/116 e2e (Playwright) + 14 new pipeline-v2 tests.

---

_Last updated: 2026-06-02_
_Dev server: `npm run dev` → http://localhost:3000_

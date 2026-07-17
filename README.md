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
- Schedule with status (V3: pending/scheduled/in_progress/done/revision)
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

| File | Description |
|------|-------------|
| `001-030` | Core schema: users, orders, customers, products, materials, BOM, production_jobs, payments, stock RPCs |
| `031a_add_hero_video_url.sql` | Add hero_video_url to landing_settings |
| `031b_landing_section_texts.sql` | Landing page section text fields |
| `032-052` | Pipeline photos, material price history, stock opname, steam revision, V3 branching |
| `053_fix_landing_settings_rls.sql` | Fix RLS policies (OR true bug) |
| `054_add_rls_to_tables.sql` | RLS for style_rates, laundry_*, order_material_consumption |
| `055_order_items_item_type_check.sql` | CHECK constraint for item_type |
| `056_add_missing_fk_indexes.sql` | 9 FK indexes for performance |
| `057_user_fk_on_delete_set_null.sql` | Cascade delete fix for user FKs |
| `058_security_definer_role_checks.sql` | Security definer RPC audit |

---

## Changelog (Latest)

### 2026-07-18 — Full Audit & Fixes
- **Proxy migration**: `middleware.ts` → `proxy.ts` (Next.js 16 convention)
- **Security**: Auth helpers, rate limiting, mass assignment protection, IDOR, setup endpoint protect
- **Workflow**: Whitelist financial fields, photo requirement refinement, BookingCalendar per-date fix
- **Charts**: Recharts polish — gradient bars, animation, donut charts, styled tooltips
- **Docs**: `.env.example`, updated `todo.md`, merged to `doc/todo.md`

---

*Dev server: `npm run dev` → http://localhost:3000*
*Last updated: 2026-07-18*

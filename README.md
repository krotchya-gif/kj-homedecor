# KJ Homedecor — Gorden & Curtain Management Platform

Sistem manajemen operasional lengkap untuk KJ Homedecor — spesialis gorden, curtain, dan roman blind premium. Dibangun dengan Next.js 16 App Router dan Supabase.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Payments:** Xendit API (VA/QRIS)
- **PDF:** jsPDF + jspdf-autotable (Invoice & Packing List)
- **Charts:** Recharts (Owner, Admin, Finance dashboards)
- **Image Compression:** browser-image-compression
- **Deployment:** Vercel-ready

---

## Features

### Admin (`/admin`)
- Order management dengan filter by status + create order (Kirim/Pasang)
- Order detail dengan visual pipeline, photo upload per status, BOM auto-suggest
- Invoice PDF + Packing List PDF generation
- Pipeline ETA (Estimasi Selesai per order)
- Catalog management (products, categories, banners)
- Customer database with WhatsApp integration
- Booking calendar (admin + public `/booking`)
- Portfolio/inspiration blog posts
- Sales reports dengan MoM growth indicators
- Shipping workflow (resi + courier)
- SEO management + Landing page settings
- Staff account creation

### Owner (`/owner`)
- Real-time dashboard: today's new orders + active installations
- 12-month revenue trend chart
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
- Supplier management + PO from approved PRs
- Piutang (accounts receivable) management
- Accounts, Journal, Cash, Assets
- **Laporan Keuangan (10 reports)** — Neraca, Laba Rugi, Buku Besar, Daftar Jurnal, Mutasi Kas, Kronologi HPP, Neraca Saldo, Performa Tag, Umur Piutang, Umur Hutang
- Reports: revenue, penjahit wages, overtime

### Gudang (`/gudang`)
- Production job queue
- Laundry/Steam (same page, tabs)
- Stock position (Material + Produk tabs)
- Low stock alerts with 1-click PR creation
- QC (Pass/Fail/Revision with photo evidence)
- Lembur (overtime) logging

### Penjahit (`/penjahit`)
- Job queue with meter tracking
- Monthly performance reports
- Work history

### Installer (`/installer`)
- Schedule with status (Terjadwal/Dikerjakan/Selesai)
- Installation checklist with photo evidence
- Revision flow: "Laporkan Masalah" at location
- Reports per period

### Public Pages
- `/` — Landing page with hero, categories, products, portfolio
- `/catalog` — Full product catalog with search
- `/products/[slug]` — Product detail
- `/booking` — Public booking form (date + time slot picker)
- `/login` — Staff login

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (public)
│   ├── (auth)/login/              # Staff login
│   ├── (auth)/register/           # Staff registration (admin only)
│   ├── (dashboard)/               # Protected dashboard group
│   │   ├── admin/                 # Admin: orders, catalog, customers, booking, reports, shipping, staff, landing-settings, seo
│   │   ├── finance/               # Finance: BOM, HPP, payments, suppliers, piutang, accounts, journal, reports
│   │   ├── gudang/                # Gudang: production, steam, stock, alerts, qc, lembur
│   │   ├── penjahit/              # Penjahit: jobs, reports, history
│   │   ├── installer/             # Installer: schedule, checklist, reports
│   │   └── owner/                 # Owner: overview, Hpp, marketplace, materials, products, staff, suppliers, price-history
│   ├── booking/                   # Public booking page
│   ├── catalog/                   # Public catalog
│   ├── products/[slug]/          # Public product detail
│   └── api/                       # API Routes
│       ├── upload/               # Local file upload
│       ├── orders/               # Order CRUD
│       ├── customers/           # Customer CRUD
│       ├── products/            # Product CRUD
│       ├── materials/           # Material CRUD
│       ├── suppliers/           # Supplier CRUD
│       ├── install-bookings/    # Booking CRUD
│       ├── purchase-requests/   # PR CRUD + approval
│       ├── purchase-orders/     # PO CRUD
│       ├── journal/             # Journal entries
│       ├── landing-settings/    # Landing page config
│       ├── webhooks/xendit/     # Xendit payment webhook
│       └── admin/create-staff/  # Staff account creation
├── components/
│   ├── ui/                       # Shadcn/ui + custom (ThemeToggle, BookingCalendar, skeletons, EmptyState)
│   ├── dashboard/                # DashboardTopNav, DashboardSidebar, layout components
│   └── landing/                  # Landing page components
├── lib/
│   ├── invoice.ts                # generateInvoicePDF + generatePackingListPDF
│   └── upload.ts                 # uploadToLocal helper
├── utils/supabase/
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # Server client (SSR)
│   └── middleware.ts             # Auth middleware
├── types/index.ts                # TypeScript interfaces
└── app/globals.css               # Global styles + CSS variables
```

---

## Database Migrations

Located in `supabase/migrations/` — apply in order. Key migrations:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables: users, orders, customers, products, materials, suppliers, BOM, production_jobs, payments, order_logs, banners, portfolio_posts |
| `015_order_number.sql` | order_number column + generate_order_number() function |
| `032_order_progress_photos.sql` | order_progress_photos table for pipeline photo tracking |
| `033_material_price_history.sql` | material_price_history table for price tracking |
| `034_install_bookings_revision.sql` | revision_reason + revision_photos on install_bookings |
| `035_orders_estimated_completion.sql` | estimated_completion column on orders |

---

## Design System

**Brand Color:** `#cc7030` (warm brown/orange)

**Light Mode:**
| Usage | Color |
|---|---|
| Primary button | `#cc7030` |
| Background | `#fafafa` |
| Card/Surface | `#ffffff` |
| Text heading | `#1f2937` |
| Text muted | `#6b7280` |

**Dark Mode:** Warm dark palette in `globals.css` (`.dark` class on `<html>`)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/invoice.ts` | Invoice & Packing List PDF generation |
| `src/lib/upload.ts` | Local upload helper (`uploadToLocal`) |
| `src/components/ui/DateRangePicker.tsx` | Interactive calendar popup date range picker |
| `src/components/ui/ReportPDFButton.tsx` | Styled PDF download button (px-5 py-2.5) |
| `src/components/ui/BackButton.tsx` | Navigation back button |
| `src/components/ErrorBoundary.tsx` | React ErrorBoundary for graceful error handling |
| `src/components/ui/ThemeToggle.tsx` | Dark mode toggle |
| `src/components/ui/BookingCalendar.tsx` | Public booking calendar |
| `src/components/ui/skeleton.tsx` | Loading skeletons (TableSkeleton, StatCardSkeleton) |
| `src/components/ui/EmptyState.tsx` | Empty state component |
| `src/components/dashboard/DashboardSidebar.tsx` | Sidebar navigation |

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

**Phase 1-4 Complete** ✅

All planned features implemented:
- Order pipeline with photo tracking
- BOM + HPP calculator
- Payment gate (DP/Lunas approval)
- Installer revision flow
- Invoice/Packing List PDF
- MoM growth reports
- Real-time owner dashboard
- Material price history
- Public booking calendar
- Dark mode, PWA, ErrorBoundary
- Laporan Keuangan (10 reports each for Finance + Owner with DateRangePicker + PDF export)
- Pipeline progress photos — clickable stages showing photo evidence per stage
- Auto transition production→steam when penjahit completes job

**Marketplace Sync:** Ditunda (requires partnership with platform)

---

*Last updated: 2026-05-30 (session)*
*Dev server: `npm run dev` → http://localhost:3000*
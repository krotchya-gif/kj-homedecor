# KJ Homedecor — Gorden & Curtain Management Platform

Sistem manajemen operasional lengkap untuk KJ Homedecor — spesialis gorden, curtain, dan roman blind premium. Dibangun dengan Next.js 16 App Router dan Supabase.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind-compatible CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments:** Xendit API
- **Deployment:** Vercel-ready

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Staff login
│   ├── (dashboard)/
│   │   ├── admin/             # Admin dashboard
│   │   │   ├── page.tsx       # Dashboard overview + PR approvals
│   │   │   ├── orders/        # Order management (list + detail)
│   │   │   ├── catalog/       # Products, categories, banners
│   │   │   ├── customers/     # Customer database
│   │   │   ├── booking/       # Installation scheduling (calendar)
│   │   │   ├── portfolio/     # Blog/portfolio posts
│   │   │   ├── reports/       # Sales reports & pipeline funnel
│   │   │   ├── staff/         # Staff account management
│   │   │   ├── shipping/      # Packing & resi tracking
│   │   │   ├── landing-settings/ # Hero, WhatsApp, trust badges, social
│   │   │   └── seo/           # Meta Pixel, GA4, sitemap, robots.txt
│   │   ├── finance/           # Finance dashboard
│   │   │   ├── materials/     # BOM & material management
│   │   │   ├── hpp/          # HPP calculator
│   │   │   ├── payments/     # Payment tracking
│   │   │   ├── suppliers/    # Supplier & PO management
│   │   │   └── reports/      # Financial reports
│   │   ├── gudang/           # Warehouse dashboard
│   │   │   ├── production/   # Production job queue
│   │   │   ├── steam/       # Laundry/steam process
│   │   │   ├── stock/       # Stock positions
│   │   │   ├── alerts/      # Low stock alerts → PR creation
│   │   │   ├── qc/          # Quality control
│   │   │   └── lembur/      # Overtime logging
│   │   ├── penjahit/        # Tailor dashboard
│   │   │   ├── jobs/        # Job queue
│   │   │   ├── reports/     # Performance reports
│   │   │   └── history/     # Work history
│   │   ├── installer/        # Installation team dashboard
│   │   │   ├── schedule/    # Installation schedule
│   │   │   ├── checklist/  # Installation checklist + photo evidence
│   │   │   └── reports/    # Installation history
│   │   └── owner/           # Owner overview (all divisi)
│   │       ├── staff/       # Staff management
│   │       ├── products/    # Top products
│   │       └── marketplace/ # Marketplace overview
│   ├── booking/             # Public booking form
│   ├── catalog/            # Public product catalog
│   ├── products/[slug]/    # Public product detail
│   └── api/                # API routes
│       ├── orders/          # Order CRUD
│       ├── customers/       # Customer CRUD
│       ├── products/        # Product CRUD
│       ├── materials/       # Material CRUD
│       ├── suppliers/        # Supplier CRUD
│       ├── install-bookings/ # Booking CRUD
│       ├── purchase-requests/ # PR CRUD + approval
│       ├── purchase-orders/  # PO CRUD
│       ├── landing-settings/  # Landing page settings
│       ├── seo/upload-sitemap/ # sitemap.xml upload
│       ├── seo/upload-robots/  # robots.txt upload
│       ├── upload/           # File upload (evidence, banners)
│       ├── xendit/          # Payment creation + webhook
│       └── admin/create-staff/ # Staff account creation
├── components/
│   ├── dashboard/           # DashboardTopNav, layout components
│   ├── ui/                 # ThemeToggle, badges, buttons
│   └── SeoScripts.tsx      # Dynamic Pixel + GA4 injection
├── types/index.ts          # TypeScript interfaces
├── utils/supabase/         # Client, server, middleware clients
└── app/globals.css        # Global styles + CSS variables
```

## Database Migrations

Located in `supabase/migrations/` — apply in order:

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core tables: users, orders, customers, products, materials, suppliers, BOM, production_jobs, payments, order_logs |
| 002 | `002_order_logs_tracking.sql` | Order status pipeline, order_logs action constraints |
| 003 | `003_return_refund_flow.sql` | Return/refund flow |
| 004 | `004_landing_settings.sql` | Landing page settings table (hero, WhatsApp, trust badges) |
| 005 | `005_add_social_media_to_landing_settings.sql` | Social media links |
| 006 | `006_booking_schema_fix.sql` | Booking/install scheduling schema |
| 007 | `007_add_shipping_packing.sql` | Packed/shipped status, tracking_number, courier |
| 008 | `008_seo_settings.sql` | SEO fields: pixel_id, ga4_id, meta tags, og_image |

## Order Status Pipeline

```
new → sorted → payment_ok → production → ready → packed → shipped → done
                                                        ↘ returned
                                                        ↘ cancelled
```

## User Roles

- **admin** — Full access (orders, catalog, customers, booking, portfolio, reports, staff, shipping, landing, SEO)
- **finance** — BOM, HPP, payments, suppliers, financial reports
- **gudang** — Production, steam, stock, alerts, QC, overtime
- **penjahit** — Job queue, reports, history
- **installer** — Schedule, checklist, reports
- **owner** — Overview of all divisi (single account access)

## Key Features

### Admin
- Order management dengan filter by status (new → done)
- Marketplace sources: Offline, Shopee, Tokopedia, TikTok, Landing Page
- Klasifikasi: Kirim vs Pasang
- Shipping workflow: Mark Packed → Input Resi (courier + tracking number)
- Booking installation scheduling dengan kalender
- Catalog management (products, categories, banners)
- Portfolio/inspiration blog posts
- Sales reports dengan pipeline funnel
- SEO management (Meta Pixel, GA4, sitemap.xml, robots.txt)
- Landing page settings (hero, WhatsApp, trust badges, social media)

### Finance
- BOM & material cost calculation
- HPP (Harga Pokok Penjualan) calculator
- Payment tracking (DP → Lunas)
- Supplier management + PO creation from approved PRs

### Gudang
- Production job queue
- Steam/laundry process tracking
- Stock position monitoring
- Low stock alerts → auto PR creation

### Penjahit
- Job queue dari admin orders
- Rekap meter lari per order

### Installer
- Schedule view dari booking
- Installation checklist dengan foto evidence

### Owner
- Overview semua divisi
- Marketplace performance
- Top produk
- Staff overview

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
XENDIT_API_KEY=
```

## Getting Started

```bash
npm install
npm run dev
```

Apply migrations to Supabase before running:
```bash
# Apply via Supabase CLI or dashboard
supabase db push
```

## Public Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, products, testimonials |
| `/catalog` | Full product catalog with search/filter |
| `/products/[slug]` | Product detail page |
| `/booking` | Public installation booking form |
| `/login` | Staff login |

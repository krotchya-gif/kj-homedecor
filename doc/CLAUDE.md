# KJ Homedecor — Development Guide

*Omnichannel ERP platform untuk home decor business (gorden, curtain, roman blind).*

**Reference:** `doc/TODO.md` (current tasks)
**Reference:** `doc/supabase.md` (database schema)
**Status:** ✅ Landing + Auth + Dashboards + Order System + Laporan Keuangan + PDF + Mobile Responsive

---

## 📊 Implementation Status (2026-05-30 Session)

### Complete ✅
- [x] Landing page + Booking calendar public
- [x] Auth flow (admin-created accounts, role-based routing)
- [x] All 6 dashboards (Admin, Gudang, Penjahit, Finance, Installer, Owner)
- [x] Order management (pipeline, payment gate, production, installation)
- [x] HPP Calculator (BOM-based + manual override)
- [x] Double-entry journal (auto-journal from transactions)
- [x] Laporan Keuangan (10 reports each for Finance + Owner: Neraca, Laba Rugi, Buku Besar, Jurnal, Mutasi Kas, Kronologi HPP, Neraca Saldo, Performa Tag, Umur Piutang, Umur Hutang)
- [x] Product search in add order item modal (name + SKU)
- [x] Style variants (Smokring/Kaitan/Kupu-kupu/Romanshade) in order item form
- [x] Pipeline photos popup — clickable stage dots showing progress photos
- [x] Auto transition `production → steam` when penjahit completes job
- [x] Realtime subscriptions on penjahit jobs, installer schedule, and gudang/steam
- [x] RLS policies added for `steam_jobs` and `order_progress_photos`
- [x] DateRangePicker with interactive calendar popup
- [x] PDF export (jsPDF + autoTable) for all reports
- [x] Mobile responsive (charts, tables, dashboard components)
- [x] PWA support + Dark mode
- [x] Local file upload (not Supabase Storage)
- [x] Phase 4B — Gudang low stock alerts (existing) + Material price tracking
- [x] Phase 4C — Invoice/Packing List PDF, Pipeline ETA, MoM growth reports
- [x] Phase 4D — Owner real-time dashboard widgets (today's orders, active installs)

### Security Hardening (2026-05-27) ✅
- [x] Phase 1 — API auth checks (7 routes: products, customers, materials, install-bookings, purchase-requests, suppliers, upload)
- [x] Phase 2 — Response format standardization (`{ data, error: { message } }` across all API routes)
- [x] Phase 3 — Zod validation (POST schemas on 6 endpoint groups)
- [x] Phase 4 — Bug fixes (realtime cleanup, xendit idempotency, order race condition/rollback, verified_by removed)
- [x] Phase 5 — Pagination (materials page) + ErrorBoundary component

---

## 🆕 Recently Implemented (2026-05-30 Session)

### Pipeline Fixes — Production Flow (2026-05-30)
- **Auto `production → steam`** transition when penjahit submits report — no manual step needed
- **Realtime subscription** on `/penjahit/jobs` — penjahit auto-refreshes when Gudang assigns job
- **Realtime subscription** on `/installer/schedule` — installer auto-refreshes when booking is assigned
- **Realtime subscription** on `/gudang/steam` — Gudang auto-refreshes when new steam_jobs created
- **Fix**: `steam_jobs` creation — now fetches `order_id` from DB (not local state)
- **Migration 037**: RLS policy on `steam_jobs` (was missing since migration 010)
- **Migration 038**: RLS policy on `order_progress_photos` (was missing since migration 032)
- **Pipeline photos popup** — click any stage dot in order detail → popup showing all photos from that stage (badge indicator for stages with photos)

### Order Item Modal Improvements (2026-05-28)
- **Product search** — searchable dropdown by name + SKU in add order item modal
- **Style variant cards** — Smokring, Kaitan, Kupu-kupu, Romanshade radio cards in Gorden form
- **Smokring color selector** — appears when Smokring style is selected
- **Invoice/Packing List PDF fix** — now passes `order_items` to PDF functions correctly

### Laporan Keuangan — Consolidated Structure (2026-05-30)
- **10 Laporan Keuangan** tersedia untuk Finance (`/finance/laporan/[report]`) dan Owner (`/owner/laporan/[report]`)
- Konsolidasi dari struktur lama yang tersebar di berbagai sub-menu
- Setiap laporan memiliki:
  - `DateRangePicker` dengan calendar popup interaktif (click tanggal → calendar terbuka → pilih range)
  - `ReportPDFButton` (styled, px-5 py-2.5, icon size-18)
  - `BackButton` navigasi ke hub laporan
  - Export PDF via jsPDF + autoTable

**Daftar 10 Laporan:**
| Route | Deskripsi |
|-------|-----------|
| `/laporan/neraca` | Aset, Liabilitas, Ekuitas |
| `/laporan/laba-rugi` | Profit & Loss statement |
| `/laporan/buku-besar` | General ledger per akun |
| `/laporan/daftar-jurnal` | Daftar entries jurnal |
| `/laporan/mutasi-kas` | Perubahan saldo kas & bank |
| `/laporan/kronologi-hpp` | HPP per periode |
| `/laporan/neraca-saldo` | Trial balance (debit-kredit) |
| `/laporan/performa-tag` | Laba rugi per marketplace |
| `/laporan/umur-piutang` | Aging piutang per pelanggan |
| `/laporan/umur-hutang` | Aging hutang per pemasok |

### DateRangePicker — Interactive Calendar Popup
- `src/components/ui/DateRangePicker.tsx` — Calendar popup yang terbuka saat klik tanggal
- Bulan navigasi dengan ChevronLeft/ChevronRight buttons
- Range selection: click start date → click end date
- Quick presets: 7 Hari, 30 Hari, Bulan Ini, Semua
- "Terapkan" button untuk konfirmasi, "Batal" untuk cancel
- Format tanggal Indonesia (dd Mon yyyy)

### Owner Dashboard — Neraca Report (2026-05-28)
- Owner memiliki halaman Laporan Neraca (`/owner/laporan/neraca`)
- 3 kolom: Aset (kuning), Liabilitas (merah), Ekuitas (hijau)
- Read-only version dari Finance, dengan BackButton ke `/owner/laporan`

### HPP Calculator — Mobile Responsive (2026-05-28)
- `/owner/hpp` — flex-wrap grid, responsive di mobile
- Product selector + BOM materials table + calculation result
- Mobile: grid auto-fit `minmax(280px, 1fr)`

### Invoice & Packing List PDF (Phase 4C)
- `src/lib/invoice.ts` — `generateInvoicePDF()` and `generatePackingListPDF()` functions
- Invoice: orange header, bill-to info, item table with DP/Lunas/Total footer
- Packing List: blue header, weight calculation (meter × 0.4kg), readiness status
- Buttons in order detail header area

### Pipeline ETA — Estimasi Selesai (Phase 4C)
- Panel in order detail showing stage X/Y and remaining pipeline
- Calculated from current status + default hours per status
- Column: `orders.estimated_completion` (migration 035)

### MoM Growth Reports (Phase 4C)
- Admin reports stat cards show month-over-month percentage change
- Green/red badges: TrendingUp (positive) / TrendingDown (negative)
- Previous period auto-calculated (prior month or prior year)

### Owner & Admin Real-time Dashboard (Phase 4D)
- Admin dashboard (`/admin`) has 8 real-time stat cards:
  - "Real-time Hari Ini" — new order count + omzet (green)
  - "Produksi Aktif" — in-production + steam count (cyan)
  - "Instalasi Aktif" — in-progress + scheduled + revision counts (purple)
  - "PR Pending" — alert when purchase requests need approval (orange)
  - Total Orders, Menunggu Bayar, Selesai, Total Pelanggan
- Owner dashboard (`/owner`) has 4 stat cards: Real-time Hari Ini, Instalasi Aktif, Omzet Bulan Ini, Pesanan
- Install bookings tracked via realtime subscription on `install_bookings` table
- Both dashboards show live operational snapshot without page refresh

### Installer Revision Flow (Phase 4C)
- "Laporkan Masalah" button visible when booking status = `in_progress`
- Modal: reason textarea + photo upload grid
- On submit: status → `revision`, `revision_reason` + `revision_photos` saved
- Order log entry created for audit trail

### Material Price History (Phase 4B)
- `/owner/suppliers/price-history` — split panel: material list | price timeline
- `material_price_history` table (migration 033) tracks price changes per supplier
- Trend indicators: TrendingUp / TrendingDown / Minus icons

### Booking Calendar Public ✅
- `/booking` — full public booking page with `BookingCalendar` component
- Time slot picker with occupied slot detection
- Submit to `install_bookings` with `source: 'website'`, opens WhatsApp confirmation
- Admin management at `/admin/booking`

### BOM Auto-Suggest (Phase 4A)
- When adding order items, selecting a product auto-loads BOM materials
- Material panel shows required qty per material with stock availability
- Helps Gudang verify stock before production starts

### Security Hardening (2026-05-27)
- **API Auth** — All data API routes now require authentication check via `getUser()`. Unauthenticated requests return `401 Unauthorized`.
- **Zod Validation** — POST endpoints for products, customers, materials, install-bookings, purchase-requests, suppliers now use Zod schemas with `safeParse()`.
- **Response Standardization** — All API routes use consistent `{ data: T, error: { message: string } | null }` format.
- **Xendit Idempotency** — Webhook checks for existing payment before inserting to prevent duplicates.
- **Order Rollback** — If order creation fails after customer insert, orphaned customer is deleted.
- **Realtime Cleanup** — Admin dashboard realtime subscription properly cleaned up on unmount.
- **ErrorBoundary** — React ErrorBoundary component wraps app (root + dashboard layout) for graceful error handling.
- **Pagination** — Materials page now uses range-based pagination with PAGE_SIZE=20 and dual count queries.

### Order Number System
- Sequential human-readable order number: `ORD-YYYY-NNNN` format
- Generated via `generate_order_number()` DB function on order creation
- Displayed in orders list, order detail, and shipping pages
- Required for invoice & faktur pajak

### Per-Order Activity Feed
- Admin dashboard now shows grouped per-order activity (not flat global feed)
- Each order card shows: order_number, customer, status icon, mini timeline
- Max 10 recent orders with 3 latest activities each

### Order System Fixes (2026-05-09)
- **Pipeline fix** — `packed` and `shipped` added to order detail status pipeline (full flow: new→sorted→payment_ok→production→steam→ready→packed→shipped→done)
- **Steam label** — `steam: "Steam/QC"` added to `STATUS_LABELS`
- **Payment UI** — "+ Tambah Pembayaran" button in order detail for manual DP/Lunas recording
- **Return reason display** — `return_reason` shown in order info section when order is cancelled/returned
- **Courier value storage** — stores as value (`jne`) not label, with backwards-compat lookup for existing label-based data
- **LaundryOrder.order_id** — added `order_id` field to `LaundryOrder` interface for bidirectional linking to parent order
- **Status transition validation** — API (`PUT /api/orders/[id]`) now validates status transitions with 400 error on invalid transitions
- **Laundry received_at** — auto-set to `new Date().toISOString()` on creation (no longer null)
- **Laundry self-assign** — workers can self-assign unassigned pending orders from `/laundry/jobs` page

### Database Migrations
```sql
-- 015_order_number.sql — Run in Supabase SQL Editor
-- Adds order_number column + generate_order_number() function
ALTER TABLE orders ADD COLUMN order_number TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(order_number FROM 'ORD-\d{4}-(\d+)$')::int)
       FROM orders WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
      0) + 1 AS TEXT), 4, '0');
$$ LANGUAGE SQL;
```

### PWA Support (Installable App)
- `public/manifest.json` — App manifest for standalone display
- `public/sw.js` — Service worker with network-first caching + offline fallback
- App can be installed on mobile/desktop as a native-like app

### Dark Mode
- Toggle switch in dashboard navbar (top-right, between theme toggle and notifications)
- Uses `next-themes` with `attribute="class"` — system preference auto-detected
- Full dark mode CSS variables in `src/app/globals.css` (`.dark` class)
- Components covered: topnav, stat cards, module cards, data tables, forms, user dropdown, mobile drawer

### Local Storage (Image Uploads)
- **No Supabase Storage used** — all uploads go to local server
- Upload API: `src/app/api/upload/route.ts`
- Helper: `src/lib/upload.ts` — `uploadToLocal(file, folder, options)`
- Storage path: `public/uploads/{products,banners,portfolio,evidence,documents}/`
- Client-side image compression via `browser-image-compression`

| Folder | Max Size | Compressed To | Purpose |
|--------|----------|---------------|---------|
| products | 5MB | 1MB | Product catalog images |
| banners | 5MB | 2MB | Landing page hero banners |
| portfolio | 2MB | 1MB | Blog/portfolio post images |
| evidence | 2MB | 1MB | QC, return, installation photos |
| documents | 5MB | — | PDFs, official documents |

---

## 1. Dashboards (6 Total)

| Dashboard | Role | URL | Main Functions |
|-----------|------|-----|----------------|
| **Admin** | admin | /admin | Catalog, Orders inbox, Customers, Booking, Portfolio, Reports |
| **Gudang** | gudang | /gudang | Production queue, Laundry+Steam (tabs), Stock, Retur, Lembur, Low stock alerts |
| **Penjahit** | penjahit | /penjahit | Job queue, Meter output tracking, Monthly summary |
| **Finance** | finance | /finance | BOM, Materials DB, HPP Calculator, Payment tracking, Supplier management |
| **Installer** | installer | /installer | Own schedule, Job details, Checklist, Photo evidence |
| **Owner** | owner | /owner | Overview, Staff performance, Marketplace breakdown, Top products |

**Note:** Steam + QC are part of Gudang dashboard (same page, different tabs/sections) — NOT a separate dashboard.

---

## 2. Directory Structure

```
projects/kj-homedecor/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (public)
│   │   ├── (auth)/                     # Auth group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx      # Admin only
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/                # Dashboard group (protected)
│   │   │   ├── admin/                 # Admin dashboard
│   │   │   ├── gudang/                # Gudang dashboard
│   │   │   ├── penjahit/              # Penjahit dashboard
│   │   │   ├── finance/              # Finance dashboard
│   │   │   ├── installer/            # Installer dashboard
│   │   │   └── owner/                # Owner dashboard
│   │   └── api/                       # API Routes
│   │       ├── upload/               # Local file upload
│   │       ├── orders/
│   │       ├── products/
│   │       └── webhooks/              # Xendit webhooks (Phase 3)
├── components/
│   ├── ui/                            # Shadcn/ui components + ThemeToggle
│   ├── dashboard/                     # Dashboard-specific (DashboardTopNav)
│   └── landing/                       # Landing page components
├── utils/
│   └── supabase/
│       ├── client.ts                  # Browser client
│       ├── server.ts                  # Server client (SSR)
│       └── middleware.ts              # Auth middleware
├── lib/
│   └── upload.ts                      # Local upload helper
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # Service worker
│   └── uploads/                       # Local file storage
│       ├── products/
│       ├── banners/
│       ├── portfolio/
│       ├── evidence/
│       └── documents/
├── .env.local
├── .env.example
├── CLAUDE.md                          # This file
├── DEPENDENCIES.md                    # Dependencies setup guide
└── package.json
```

---

## 3. Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Staff accounts | id (FK auth.users), name, role, status |
| `customers` | Customer records | name, phone, address, notes |
| `categories` | Product categories | name, slug, image_url, parent_id |
| `products` | Product catalog | name, category_id, sku, price, stock_toko |
| `materials` | Raw materials (BOM) | name, unit, cost_per_unit, stock_gudang, stock_toko, min_stock_level, supplier_id |
| `suppliers` | Material suppliers | name, contact, address |
| `bom` | Bill of Materials | product_id, material_id, qty_per_unit |
| `orders` | Sales orders | source, customer_id, classification, status, payment_status, dp_amount, lunas_amount, total_amount |
| `order_items` | Line items | order_id, product_id, qty, price, size, meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu, poni_lurus, poni_gel, smokering_color, ready |
| `production_jobs` | Penjahit assignment | order_id, penjahit_id, status, meter_gorden, meter_vitras, meter_roman, meter_kupu_kupu, started_at, completed_at |
| `production_reports` | Monthly penjahit pay | penjahit_id, month, year, meter totals, rate_per_meter (JSONB), total_upah |
| `inventory_movements` | Stock log (materials) | material_id, type (in/out/transfer), qty, reason, from_location, to_location, created_by |
| `low_stock_alerts` | Below threshold alerts | material_id, current_qty, min_qty, resolved_at |
| `purchase_requests` | PR workflow | material_id, qty, estimated_cost, status, created_by, approved_by |
| `purchase_orders` | PO from approved PR | pr_id, supplier_id, actual_cost, status, invoice_document, proof_of_payment, paid_at, paid_by |
| `install_bookings` | Installation scheduling | order_id, customer_id, address, date, time, type, status, installer_id, notes |
| `install_checklists` | Installer checklist | booking_id, items (JSON), completed_at, photo_evidence |
| `payments` | DP/Lunas tracking | order_id, type (dp/lunas), amount, date, verified_by, verified_at |
| `journal_entries` | Accounting entries | date, account, description, debit, credit |
| `banners` | Landing page banners | image_url, sequence, is_active |
| `portfolio_posts` | Blog posts | title, content, images (JSONB) |
| `landing_settings` | Landing page config | hero_title, hero_subtitle, whatsapp_number, trust_badges (JSONB), social_media (JSONB) |
| `lembur_records` | Overtime | staff_name, date, time_start, time_end, total_hours, notes, created_by |
| `qc_records` | QC pass/fail | order_id, order_item_id, result, fail_reason, photo_evidence (JSONB), revision_notes, checked_by, checked_at |

### Stock Schema

```
materials:
  - stock_gudang NUMERIC DEFAULT 0   # Warehouse (raw materials)
  - stock_toko NUMERIC DEFAULT 0      # Retail store

products (finished goods):
  - stock_toko NUMERIC DEFAULT 0      # Only — no stock_gudang
```

**Stock Flow:**
```
Supplier delivers → inventory_movements (in) → materials.stock_gudang increases
Order uses materials → inventory_movements (out) → materials.stock_gudang decreases
Production done → products.stock_toko increases
Order fulfilled → products.stock_toko decreases
```

---

## 4. Key Business Rules

### Payment Gate (Finance approves before ship/install)
```
Order cannot be shipped until Finance approves.
- dp_amount + lunas_amount >= total_amount
- payment_status = 'paid'
- verified_by must be set
```

### Payment Classification
```
Marketplace (Shopee/Tokopedia/TikTok): Full payment via platform → payment_status = 'paid' (lunas)
Landing page + Xendit: Full payment via Xendit → payment_status = 'paid' (lunas)
Offline orders: DP + Lunas manual → payment_status progresses: pending → partial → paid
```

### Penjahit Payment (per meter, not per piece)
```
Rate per meter (Finance sets):
  - Gorden: Rp 5,000/meter
  - Vitras: Rp 3,000/meter
  - Roman: Rp 7,000/meter
  - Kupu-Kupu: Rp 6,000/meter

Monthly: total_upah = Σ(meter_type × rate_per_meter)
```

### Order Classification
```
Kirim  = Send only (no installation)
Pasang = Requires installation (schedule with installer)
```

### Low Stock Alert
```
material.stock_gudang < min_stock_level → alert created → Gudang creates PR → Admin approves → PO generated
```

### Gudang Workflow (Laundry + Steam — Same Page)
```
Order item ready → Gudang: Laundry/Steam tab → Process (kg, meter, description)
    ↓
QC check → Pass/Fail?
    ↓
Fail → Record fail_reason + photo → Worker revises → Re-upload evidence
    ↓
Pass → Ready to ship/install
```

### Material Selection (Order → BOM lookup)
```
When creating custom order:
1. Select product → BOM auto-loads materials needed
2. Gudang checks: materials available in stock_gudang?
3. If yes → proceed (stock auto-allocated)
4. If no → alert "need procurement" → create PR
```

---

## 5. Auth Flow (Admin-Created Accounts)

### Key Principles
1. **No self-signup** — Admin creates all staff accounts
2. **Email/password** — Staff login with credentials
3. **Role-based redirect** — After login, redirect to role-specific dashboard

### Signup Flow (Admin Action Only)
```typescript
// Admin creates staff account
async function createStaffAccount(email, password, name, role) {
  // 1. Create auth user
  const { data } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  // 2. Create user record with role
  await supabase.from('users').insert({
    id: data.user!.id,
    name,
    role,
    status: 'active'
  })
}
```

### Login Flow
```typescript
// Login → redirect based on role
const dashboards = {
  admin: '/admin',
  gudang: '/gudang',
  penjahit: '/penjahit',
  finance: '/finance',
  installer: '/installer',
  owner: '/owner'
}
```

### Auth Middleware (protect all dashboard routes)
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabaseResponse = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  const isDashboard = request.nextUrl.pathname.match(/^\/(admin|gudang|penjahit|finance|installer|owner)/)

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
```

---

## 6. HPP Calculator

### Auto-Calculate (from BOM)
```typescript
function calculateHPP(productId): HPPResult {
  const bom = getBOM(productId)

  // Material cost
  const material_cost = bom.reduce((sum, item) =>
    sum + (item.qty_per_unit * item.material.cost_per_unit), 0
  )

  // Production cost (from order item meters)
  const production_cost = calculateProductionCost(orderItem)

  const total_hpp = material_cost + production_cost

  return {
    material_cost,
    production_cost,
    total_hpp,
    markup_percentage: 30, // default
    harga_jual: total_hpp * 1.3
  }
}
```

### Manual Override
```typescript
interface Product {
  hpp_calculated: number    // auto from BOM
  hpp_manual: number | null // Finance override
  harga_jual: number        // = hpp_manual ?? hpp_calculated
}
```

---

## 7. Image / Storage Strategy

### ⚠️ Local Storage (NOT Supabase Storage)
All file uploads go to local server storage at `public/uploads/`. This avoids Supabase Storage costs for large catalogs (2500+ products).

### Upload API
```typescript
// src/lib/upload.ts
import { uploadToLocal } from '@/lib/upload'

// Usage:
const result = await uploadToLocal(file, 'banners', { compress: true, maxSizeMB: 2 })
// Returns: { url: '/uploads/banners/123456-abc123.jpg', filename, size, type }
```

### API Route
- `POST /api/upload` — accepts FormData with `file` and `folder` fields

### Compression (client-side before upload)
```typescript
import imageCompression from 'browser-image-compression'

// Handled automatically by uploadToLocal() unless compress: false
```

### Image Specs
| Context | Max Input | Compressed | Format |
|---------|-----------|------------|--------|
| Product photos | 5MB | 1MB | JPEG/PNG/WebP |
| Banners | 5MB | 2MB | JPEG/PNG/WebP |
| Portfolio | 2MB | 1MB | JPEG/PNG |
| Evidence (laundry/steam/install) | 2MB | 1MB | JPEG/PNG |
| QC rejection photos | 2MB | 1MB | JPEG/PNG |

---

## 8. PWA Support

### Files
- `public/manifest.json` — App manifest for installable PWA
- `public/sw.js` — Service worker with caching strategies

### Service Worker Strategy
- **Page navigations**: Network first, fallback to cache
- **Static assets**: Cache first, fallback to network
- **API calls**: Network only (no caching)
- **Offline fallback**: Returns cached `/` for navigation requests

### Installability
- Manifest with icons (192x192, 512x512)
- Service worker with `skipWaiting()` support
- `display: standalone"` in manifest

---

## 9. Dark Mode

### Implementation
- Uses `next-themes` package with `attribute="class"`
- Toggle button in `DashboardTopNav` (top-right navbar)
- System preference auto-detected on first load
- User preference persisted in localStorage

### CSS Variables
```css
.dark {
  --neutral-50: #0f0f0f;
  /* ... full dark palette */
}
/* Component-specific overrides in globals.css */
```

### Components Covered
- Top navigation (topnav, topnav-link, topnav-brand)
- Dashboard layout and content area
- Stat cards, module cards, data tables, forms
- User dropdown and mobile drawer
- Scrollbars

---

## 10. Payment Flows

### Customer Payment (Xendit — Phase 3+)
```
Customer pays via Xendit (VA/QRIS)
    ↓
Xendit webhook → /api/webhooks/xendit
    ↓
Update payments table (type: 'lunas' = full payment)
    ↓
dp_amount + lunas_amount >= total_amount → payment_status = 'paid'
    ↓
Payment gate PASSED ✅
```

### Supplier Payment (Manual)
```
Supplier sends invoice → Admin uploads to PO
    ↓
Finance does manual bank transfer
    ↓
Finance updates PO:
  - status: 'paid'
  - paid_at: now
  - proof_of_payment: upload (screenshot)
```

---

## 11. Marketplace Sync (Phase 4)

### MVP (Phase 1-3): Manual Entry
```
All orders entered manually by Admin:
- Shopee, Tokopedia, TikTok → Admin copy-paste/create order
- Landing page → WhatsApp contact → Admin creates
- Offline → Admin creates
```

### Phase 4 Options (when ready)
| Platform | Approach |
|----------|----------|
| Shopee | Official API (requires partnership) |
| Tokopedia | Official API (requires partnership) |
| TikTok | Official API (requires business account) |

**Technical:** Webhook-based sync when API available.

---

## 12. Role-Based Access

| Role | Dashboard | Access |
|------|-----------|--------|
| **Owner** | /owner | Full — finances, staff, all ops, reports |
| **Admin** | /admin | Catalog, orders, customers, booking, portfolio. Creates staff accounts. |
| **Gudang** | /gudang | Production queue, Laundry+Steam, Stock, Retur, Lembur, Low stock alerts |
| **Penjahit** | /penjahit | Own job queue, Meter tracking, Monthly summary |
| **Finance** | /finance | BOM, Materials, HPP, Payment approval, Supplier management |
| **Installer** | /installer | Own schedule, Job details, Installation checklist |

---

## 13. API Conventions

### Response Format (Standardized 2026-05-27)
```typescript
// Success: { data: T, error: null }
// Error: { data: null, error: { message: string } }

// Applies to ALL routes: orders, products, customers, materials,
// install-bookings, purchase-requests, suppliers, upload, journal,
// landing-settings, SEO upload routes, xendit webhook
```

### Zod Validation
POST routes use `safeParse()` with `ZodSchema`. Error messages use `parsed.error.issues[0].message` (Zod v4).

### Endpoints
```
GET    /api/[resource]        List (pagination where implemented)
POST   /api/[resource]        Create (Zod validated)
GET    /api/[resource]/[id]  Get one
PUT    /api/[resource]/[id]  Update
DELETE /api/[resource]/[id]  Delete
```

### Upload Endpoint
```
POST /api/upload  (FormData: file, folder) — requires auth
```

---

## 14. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, never expose
```

---

## 15. Development Setup

```bash
# 1. Enter project
cd projects/kj-homedecor

# 2. If starting fresh:
npx create-next-app@latest src --typescript --tailwind --app --src-dir --import-alias "@/*"

# 3. Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install browser-image-compression
npm install next-themes
npm install -D @types/node

# 4. Install Shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label table badge alert

# 5. Create Supabase clients
# See DEPENDENCIES.md for exact patterns (client.ts, server.ts, middleware.ts)

# 6. Run migrations
# supabase db push (via Supabase CLI)
```

---

## 16. Testing Checklist

- [ ] Auth: Admin creates staff → staff login → redirect to correct dashboard
- [ ] Role guard: unauthenticated → redirect to login
- [ ] Orders: create with Kirim/Pasang → correct classification
- [ ] Payment gate: order can't ship without full payment
- [ ] Stock: Gudang/Toko separate counts
- [ ] Material selection: BOM auto-loads, stock check
- [ ] QC workflow: fail → revision loop → pass
- [ ] Steam/QC: same Gudang page with tabs
- [ ] Dark mode toggle: switches theme, persists preference
- [ ] PWA: can be installed, works offline
- [ ] Local uploads: images saved to public/uploads/, accessible via /uploads/...

---

## 17. Common Pitfalls

1. **No self-signup** — Admin creates all staff accounts
2. **Stock separation** — Gudang vs Toko always separate
3. **Payment gate** — Check before shipping, not before invoice
4. **Laundry/Steam** — Same page, different tabs (not separate dashboard)
5. **Products stock_toko only** — No stock_gudang for products
6. **Local storage for images** — NOT Supabase Storage (cost optimization)
7. **Supabase Data API breaking change (Oct 2026)** — Existing projects must add explicit `GRANT` statements to new tables created after Oct 30, 2026. Audit migrations before then.

---

## 18. Reference Files

| File | Purpose |
|------|---------|
| `artifacts/omni-commerce-brainstorm.md` | Full project spec |
| `DEPENDENCIES.md` | Dependencies setup + usage patterns |
| `src/lib/upload.ts` | Local upload helper |
| `src/app/api/upload/route.ts` | Upload API route |
| `src/components/ui/ThemeToggle.tsx` | Dark mode toggle |
| `src/components/dashboard/DashboardTopNav.tsx` | Dashboard navbar |
| `src/components/ErrorBoundary.tsx` | React ErrorBoundary component |
| `public/sw.js` | Service worker |
| `public/manifest.json` | PWA manifest |

---

*Last updated: 2026-05-30 (session)*
*Phase 4 complete — Marketplace sync pending partnership*

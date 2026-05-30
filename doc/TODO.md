# KJ Homedecor — Project TODO

> **Omnichannel ERP untuk bisnis home decor (gorden, curtain, roman blind)**
> Tech Stack: Next.js 16 · TypeScript · Tailwind CSS · Supabase · Shadcn/ui

---

## ✅ Phase 1 — MVP (SELESAI)

### 🔧 Setup & Infrastruktur
- [x] Bootstrap Next.js 16.2 + TypeScript + Tailwind CSS v4
- [x] Install Shadcn/ui (16 components)
- [x] Install semua dependencies (Supabase, lucide-react, zod, react-hook-form, date-fns, browser-image-compression, recharts, next-themes, browser-image-compression)
- [x] `.env.local` + `.env.example` template
- [x] TypeScript types (`src/types/index.ts`) — semua entity

### 🗄️ Database
- [x] Migration SQL: `supabase/migrations/001_initial_schema.sql`
  - [x] Tabel: `users`, `customers`, `categories`, `products`
  - [x] Tabel: `materials`, `suppliers`, `bom`
  - [x] Tabel: `orders`, `order_items`
  - [x] Tabel: `production_jobs`, `production_reports`
  - [x] Tabel: `inventory_movements`, `low_stock_alerts`
  - [x] Tabel: `purchase_requests`, `purchase_orders`
  - [x] Tabel: `install_bookings`, `install_checklists`
  - [x] Tabel: `payments`, `journal_entries`
  - [x] Tabel: `banners`, `portfolio_posts`, `lembur_records`, `qc_records`, `laundry_records`
  - [x] RLS policies (Row Level Security)
  - [x] Seed data default categories

### 🔐 Auth & Middleware
- [x] Supabase browser client (`utils/supabase/client.ts`)
- [x] Supabase server client (`utils/supabase/server.ts`)
- [x] Supabase middleware client (`utils/supabase/middleware.ts`)
- [x] Auth middleware guard (`src/middleware.ts`) — protect semua dashboard routes
- [x] Login page (`/login`) — email/password + role-based redirect
- [x] API route create staff (`/api/admin/create-staff`) — service role key

### 🎨 Design System
- [x] Global CSS (`globals.css`) — brand color `#cc7030`, Inter + Playfair Display font
- [x] Module card style (Jubelio ERP style)
- [x] Stat card style
- [x] Data table style
- [x] Badge color scheme (status, payment)
- [x] Auth page style
- [x] Landing page style (hero, product cards, category tiles)
- [x] Responsive breakpoints

### 🏠 Landing Page (Public)
- [x] Sticky navbar (logo + links + WhatsApp CTA + Staff Portal)
- [x] Hero section (dark brown gradient + trust badges)
- [x] Categories grid (color-coded tiles)
- [x] Featured products grid (dari DB, fallback placeholder)
- [x] "Kenapa KJ Homedecor" section (4 keunggulan)
- [x] Portfolio/Inspirasi section (dari DB, fallback placeholder)
- [x] CTA banner (WhatsApp + Buat Janji)
- [x] Footer (kontak, produk links, social)
- [x] SEO metadata (title, description, keywords, OG)

### 📊 Dashboard Layout
- [x] `DashboardTopNav` — sticky topnav dengan role-based nav items
- [x] User menu dropdown (nama, role, logout)
- [x] `(dashboard)/layout.tsx` — server-side auth check, fetch nama + role

---

## ✅ Phase 1 — Admin Dashboard ✅

### 🧑‍💼 Admin Pages
- [x] Home (`/admin`) — stats cards + chart + progress pesanan cards
- [x] Catalog (`/admin/catalog`) — sub-module card grid
- [x] Products (`/admin/catalog/products`) — CRUD table + search + modal add/edit
- [x] Categories (`/admin/catalog/categories`) — CRUD category
- [x] Banners (`/admin/catalog/banners`) — banner management
- [x] Orders (`/admin/orders`) — list + filter status + create order modal (Kirim/Pasang)
- [x] Order Detail (`/admin/orders/[id]`) — visual status pipeline + photo upload on status change
- [x] Customers (`/admin/customers`) — list + search + add modal + WA link
- [x] Staff (`/admin/staff`) — buat akun staff (role radio cards)
- [x] Booking (`/admin/booking`) — calendar + form booking + WA reminder
- [x] Portfolio (`/admin/portfolio`) — CRUD post + multi-image upload
- [x] Reports (`/admin/reports`) — pipeline funnel + marketplace breakdown + CSV export
- [x] Shipping (`/admin/shipping`) — shipping management
- [x] Landing Settings (`/admin/landing-settings`) — landing page config
- [x] SEO (`/admin/seo`) — SEO metadata editor
- [x] Laundry (`/admin/laundry`) — laundry orders management

---

## ✅ Phase 1 — Finance Dashboard ✅

### 💰 Finance Pages
- [x] Home (`/finance`) — module card grid
- [x] Payments (`/finance/payments`) — DP/Lunas input + payment gate approval
- [x] Reports (`/finance/reports`) — revenue stats + penjahit wages + overtime
- [x] Hutang (`/finance/hutang`) — accounts payable management

### 💰 Finance — Piutang (Accounts Receivable)
- [x] Piutang Overview (`/finance/piutang`)
- [x] Channel (`/finance/piutang/channel`) — piutang by channel
- [x] Faktur (`/finance/piutang/faktur`) — faktur management
- [x] Payment (`/finance/piutang/payment`) — piutang payment recording
- [x] Process (`/finance/piutang/process`) — piutang processing
- [x] Retur (`/finance/piutang/retur`) — piutang return handling

### 💰 Finance — Accounts (Accounting)
- [x] Accounts Overview (`/finance/accounts`)
- [x] Chart of Accounts (`/finance/accounts/accounts`) — account master
- [x] Categories (`/finance/accounts/categories`) — account categories
- [x] Mapping (`/finance/accounts/mapping`) — account mapping
- [x] Mapping Difference (`/finance/accounts/mapping-difference`)

### 💰 Finance — Journal & Reports
- [x] Journal (`/finance/journal`) — general journal
- [x] Auto Journal (`/finance/journal/auto`) — auto journal entries
- [x] Journal Reports → Balance (`/finance/journal/reports/balance`)
- [x] Journal Reports → Cash Mutation (`/finance/journal/reports/cash-mutation`)
- [x] Journal Reports → COGS Chronology (`/finance/journal/reports/cogs-chronology`)
- [x] Journal Reports → Journal List (`/finance/journal/reports/journal-list`)
- [x] Journal Reports → Ledger (`/finance/journal/reports/ledger`)
- [x] Journal Reports → Profit & Loss (`/finance/journal/reports/ledger`)

### 💰 Finance — Other
- [x] Assets (`/finance/assets`) — asset management
- [x] Cash (`/finance/cash`) — cash management
- [x] Laundry Payroll (`/finance/laundry-payroll`)

---

## ✅ Phase 1 — Gudang Dashboard ✅

### 🏭 Gudang Pages
- [x] Home (`/gudang`) — module card grid (6 modul)
- [x] Production (`/gudang/production`) — queue produksi, Mulai / Selesai buttons
- [x] Steam (`/gudang/steam`) — Laundry & Steam entry dengan tab
- [x] Stock (`/gudang/stock`) — Posisi stok (Material tab + Produk tab)
- [x] Alerts (`/gudang/alerts`) — Low stock alerts + buat PR 1-click
- [x] Lembur (`/gudang/lembur`) — Input lembur per staff per hari + rekap bulan
- [x] QC (`/gudang/qc`) — QC pass/fail/revision dengan fail reason + photo evidence
- [x] Reports (`/gudang/reports`) — gudang reports

---

## ✅ Phase 1 — Penjahit Dashboard ✅

### ✂️ Penjahit Pages
- [x] Home (`/penjahit`) — module card grid
- [x] Jobs (`/penjahit/jobs`) — Job queue card-style + Mulai + Laporan inline
- [x] Reports (`/penjahit/reports`) — Rekap bulanan meter + estimasi upah
- [x] History (`/penjahit/history`) — Riwayat job selesai

---

## ✅ Phase 1 — Installer Dashboard ✅

### 🔧 Installer Pages
- [x] Home (`/installer`) — module card grid
- [x] Schedule (`/installer/schedule`) — Booking list + status update (Mulai/Selesai)
- [x] Checklist (`/installer/checklist`) — Checklist form + photo evidence upload
- [x] Reports (`/installer/reports`) — Riwayat instalasi per periode

---

## ✅ Phase 1 — Owner Dashboard ✅

### 👑 Owner Pages
- [x] Home (`/owner`) — stats (omzet, pesanan, pelanggan, produk) + trend charts
- [x] HPP (`/owner/hpp`) — HPP overview per product
- [x] Marketplace (`/owner/marketplace`) — marketplace analytics
- [x] Materials (`/owner/materials`) — materials overview
- [x] Products (`/owner/products`) — products overview
- [x] Staff (`/owner/staff`) — staff overview
- [x] Suppliers (`/owner/suppliers`) — suppliers overview

---

## ✅ Phase 1 — Shared / Laundry ✅

### 🧺 Laundry
- [x] Jobs (`/laundry/jobs`) — laundry job queue + self-assign

---

## ✅ Phase 2 — Order Pipeline ✅

### 📦 Order Pipeline
- [x] Order detail page — visual status pipeline
- [x] Status advance button (dengan payment gate check) + photo upload on status change
- [x] Order items CRUD (tambah/hapus item per order)
- [x] Meter input per item (Gorden/Vitras/Roman/Kupu²/Poni)
- [x] Item ready toggle (checklist per item)
- [x] Preparation checklist (hardware items: besi, endcup rollet, dll)
- [x] Link detail di orders list
- [x] Order number (ORD-YYYY-NNNN)

### 📦 Order Activity Log
- [x] `order_logs` table — every action recorded with staff_id + timestamp
- [x] Admin dashboard — per-order activity feed (grouped by order)
- [x] Order detail — scrollable activity history per order

### 📷 order_progress_photos Table
- [x] New table: `supabase/migrations/032_order_progress_photos.sql`
- [x] Photo upload on every status change
- [x] Lightbox display in admin dashboard cards + order detail
- [x] Stage reference (new, sorted, payment_ok, production, steam, ready, packed, shipped, done)

---

## ✅ Phase 3 — Return & Refund ✅

### 🔄 Cancel & Return Flow
- [x] Cancel order (before production) — void payments, status → cancelled
- [x] Return process (after sent/done) — condition check → good: stock_in, damaged: dispose
- [x] `returns` table — tracks return requests with condition, refund, photo evidence
- [x] Refund tracking — pending → approved → completed via Finance

---

## ✅ Bug Fixes ✅

### Round 1 — Critical
- [x] Xendit webhook — insert payment tidak di-await, no rollback
- [x] Order progress — tidak ada role enforcement di API
- [x] Middleware — finance bisa akses /admin/*, owner bisa akses /finance/*
- [x] PO stock increment — RPC failure silently skipped

### Round 1 — High
- [x] Journal API — tidak ada auth check
- [x] PO actual_cost bisa NaN di journal
- [x] Xendit payment selalu record sebagai dp, bukan lunas
- [x] Xendit callback key expose ke browser (`NEXT_PUBLIC` prefix) → `XENDIT_CALLBACK_KEY`

### Round 1 — Medium
- [x] Dashboard layout — tidak redirect unauthorized access
- [x] Admin & Finance dashboard — tidak ada charts

### Round 2
- [x] Journal API err.message crash → `instanceof Error` check
- [x] Return handling silent skip → validate items BEFORE insert
- [x] qc.order null access → optional chaining
- [x] Piutang negative → `Math.max(0, ...)` guard
- [x] YAxis tickFormatter `.replace` → `replaceAll`
- [x] useEffect dependency on totalOrders → `[]`
- [x] React hooks order violation in admin/page.tsx → removed duplicate useEffect

---

## ✅ RBAC + Security ✅

### 🔐 Role-Based Access Control
- [x] Middleware — role-based route access enforcement
- [x] API `/api/orders/[id]` — role-based status transition enforcement
- [x] Payment gate — ready/packed/shipped/done requires `payment_status='paid'`
- [x] Order 404 early return

### 🔐 Role Permissions (order status transitions)
- finance: sorted→payment_ok only
- admin/owner: all transitions
- gudang: production→steam
- installer: packed→shipped

---

## ✅ Dashboard Charts (Recharts) ✅
- [x] Admin — BarChart (order by status), BarChart (revenue by source), LineChart (30-day trend)
- [x] Finance — BarChart (monthly revenue), PieChart (payment status), BarChart (piutang aging)
- [x] Owner — 12-month LineChart trend

---

## ✅ Local Upload Storage ✅

### 📁 Upload Folders
- `products` — product images (5MB → 1MB)
- `banners` — landing page banners (5MB → 2MB)
- `portfolio` — portfolio post images (2MB → 1MB)
- `evidence` — QC, return, installation photos (2MB → 1MB)
- `documents` — PDFs, official documents (5MB)
- `order_progress` — order status tracking photos (2MB)
- `returns` — return verification photos (2MB)
- `qc` — QC evidence photos (2MB)
- `install` — installation completion photos (2MB)

### 🆕 New — Progress Pesanan UI + Lightbox
- [x] `Lightbox.tsx` — lightbox modal with keyboard nav (Escape, Arrow keys)
- [x] `LightboxGallery` — thumbnail grid with +N overflow indicator
- [x] Admin dashboard — card grid with progress bar, status badges, photo thumbnails
- [x] Order detail — photo upload modal on status change

---

## ✅ Implemented Improvements (Reference)

> Tech items that have been completed — do not suggest these again in future sessions.

### Security
- [x] Rate limiting pada login page (5 percobaan → lock 5 menit)
- [x] Role validation di setiap API route (auth check dengan `getUser()`)
- [x] Input sanitization / server-side validation dengan Zod (products, customers, materials, install-bookings, purchase-requests, suppliers)
- [x] CORS configuration (Next.js API routes default: same-origin only)

### UX/UI
- [x] Toast notifications (sukses/error feedback) — `Toast.tsx` + `useToast()`
- [x] Loading skeleton (`TableSkeleton`, `StatCardSkeleton`, `CardGridSkeleton`)
- [x] Empty state illustrations — `EmptyState.tsx` component
- [x] Mobile responsive dashboard (hamburger menu via `DashboardTopNav` + `DashboardSidebar`)
- [x] Dark mode toggle (ThemeToggle di sidebar footer)

### Performance
- [x] Image lazy loading (via `next/image` dengan `fill` + `sizes`)
- [x] Pagination untuk list tables (materials page: PAGE_SIZE=20, range-based dual query)
- [x] Supabase realtime subscriptions — admin dashboard subscribe ke `orders`, `order_logs`, `order_progress_photos` + cleanup on unmount

### Storage
- [x] Image upload UI di Products page
- [x] Local storage (bukan Supabase Storage) — `public/uploads/`

### Reports
- [x] PDF export — admin/finance reports (jsPDF + jspdf-autotable)
- [x] CSV export — owner/admin reports

---

## 📌 Database Migrations

| File | Description | Status |
|------|-------------|--------|
| `001_initial_schema.sql` | All tables + RLS + seed data | ✅ Done |
| `015_order_number.sql` | Add order_number + generate_order_number() | ✅ Done |
| `032_order_progress_photos.sql` | order_progress_photos table | ⚠️ Run manually |

---

## 🚫 Marketplace Sync (DITUNDA)
- Shopee API integration
- Tokopedia API integration
- TikTok Shop API integration
- Webhook-based order sync

---

## ✅ Phase 4 — Owner Tools & Advanced Reporting (SELESAI 2026-05-28)

> **Goal:** Berikan owner visibilitas penuh + alat kalkulasi otomatis tanpa perlu buka banyak menu.

### Phase 4A — BOM & Resep (Fondasi)

#### 1. Kalkulator BOM Otomatis (Owner only) ✅ DONE
- [x] Halaman `/owner/hpp` — kalkulator HPP per produk (complete: BOM editor, auto-calculate, save)
- [x] Dari harga material + ongkir + biaya tailin → langsung hitung HPP
- [x] Owner bisa tahu margin profit sebelum tetapkan harga
- [x] Input: product_id → auto-load BOM → kalkulasi total
- [x] Output: material_cost, production_cost, total_hpp, markup, harga_jual
- [x] Tabel `bom` di schema sudah ada (`public.bom`)

#### 2. Resep/Template Produk ✅ DONE
- [x] Saat input order, sistem auto-suggest material yang needed (BOM auto-suggest di order detail)
- [x] BOM editor sudah ada di `/owner/hpp` — sudah diekspos ke staff/admin via order item add
- [x] Material panel di order detail menunjukkan qty needed + stock availability

### Phase 4B — Data & Alerting

#### 3. Riwayat Harga Material ✅ DONE
- [x] `/owner/suppliers/price-history` — split panel design (material list | price timeline)
- [x] Tabel `material_price_history` (migration 033) — material_id, supplier_id, price, recorded_at
- [x] Trend indicators: TrendingUp/TrendingDown/Minus per material

#### 4. Stock Alert Otomatis ✅ DONE
- [x] Halaman `/gudang/alerts` — Low stock alerts + buat PR 1-click (sudah ada sejak Phase 1)
- [ ] Jika stok material di bawah `min_stock_level` → kirim notifikasi otomatis (WhatsApp/email) — optional, belum critical

### Phase 4C — Output & Reporting

#### 5. Installer Revisi & Return Flow ✅ DONE
- [x] `/installer/schedule` — tombol "Laporkan Masalah" saat status = in_progress
- [x] Form laporan: alasan (textarea) + foto bukti (upload grid)
- [x] Status booking → `revision` + `revision_reason` + `revision_photos`
- [x] Gudang melihat list revision via booking list (status = revision)
- [x] Order log entry untuk audit trail
- [x] Migration 034: `install_bookings.revision_reason`, `install_bookings.revision_photos`

#### 6. Export Invoice/Packing List ✅ DONE
- [x] `src/lib/invoice.ts` — `generateInvoicePDF()` + `generatePackingListPDF()`
- [x] Tombol di halaman order detail (Admin)
- [x] Invoice: orange header, bill-to, item table, DP/Lunas/Total footer
- [x] Packing List: blue header, weight calc (meter × 0.4kg), readiness status per item

#### 7. Pipeline Orders + Estimasi Selesai ✅ DONE
- [x] Panel "ESTIMASI SELESAI" di order detail — stage X/Y + remaining days
- [x] `orders.estimated_completion` column (migration 035)
- [x] Dihitung dari current status + default hours per stage

#### 8. Reports — MoM Growth ✅ DONE
- [x] Admin `/admin/reports` — MoM percentage badges on stat cards
- [x] TrendingUp (green, positive) / TrendingDown (red, negative) indicators
- [x] Previous period auto-calculated: prior month vs current, or prior year for annual view

### Phase 4D — Dashboard Real-time Owner ✅ DONE

#### 9. Dashboard Real-time Owner ✅ DONE
- [x] Halaman `/owner` — 4 stat cards termasuk real-time widgets
- [x] "Real-time Hari Ini" card: new order count + omzet (hijau)
- [x] "Instalasi Aktif" card: in-progress + scheduled install counts (biru)
- [x] Widget-based dengan data yang load parallel (Promise.all)
- [x] **Admin** `/admin` — 8 stat cards real-time (termasuk produksi aktif, revisi instalasi, PR pending)

---

*Last updated: 2026-05-30*
*Dev server: `npm run dev` → http://localhost:3000*

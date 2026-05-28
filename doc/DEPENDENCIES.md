# KJ Homedecor — Dependencies & Setup Guide

*How to install, configure, and use all dependencies for KJ Homedecor project.*

**For dev agents:** Read this before starting implementation. Follow versions and patterns exactly.

---

## 📋 Dependencies List

| Dependency | Version | Purpose |
|------------|---------|---------|
| `next` | ^16.2 | Framework |
| `react` | ^19 | UI library |
| `typescript` | ^5 | Type safety |
| `@supabase/supabase-js` | ^2.x | Supabase client |
| `@supabase/ssr` | ^0.x | Server-side Supabase (SSR) |
| `@radix-ui/react-*` | latest | Shadcn/ui primitives |
| `class-variance-authority` | latest | Shadcn/ui variant system |
| `clsx` | latest | Tailwind merge utility |
| `tailwind-merge` | latest | Tailwind merge utility |
| `tailwindcss` | ^4 | CSS framework (v4) |
| `recharts` | latest | Charts (Admin, Owner, Finance dashboards) |
| `browser-image-compression` | ^2.x | Image compression (local upload) |
| `next-themes` | latest | Dark mode toggle |
| `lucide-react` | latest | Icons |
| `react-hook-form` | ^7 | Form handling |
| `@hookform/resolvers` | latest | Zod integration |
| `zod` | ^3 | Schema validation (Zod v4: `error.issues[0].message`) |
| `date-fns` | latest | Date formatting |
| `jspdf` | latest | PDF generation (Invoice, Packing List) |
| `jspdf-autotable` | latest | PDF tables (invoice items, reports) |

---

## 1. Supabase — Installation & Configuration

### Install
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

> **Note:** Supabase v2 (`@supabase/ssr`) hanya butuh 1 key untuk semua (browser + server). Service role key hanya untuk admin operations (create-staff). Semua API routes yang butuh auth wajib pakai `getUser()` check.

> **⚠️ Grant Required (Oct 2026):** Semua table baru yang dibuat setelah 30 Oct 2026 harus punya explicit `GRANT` statement supaya bisa diakses via Data API. Audit migrations sebelum batas waktu.

### Directory Structure
```
src/
└── utils/
    └── supabase/
        ├── client.ts      # Browser client
        ├── server.ts      # Server component client
        └── middleware.ts  # Auth middleware
```

---

## 2. Supabase Client Setup (v2 — Latest SSR Pattern)

### Browser Client (`client.ts`)

```typescript
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
```

**Usage in Client Components:**
```typescript
'use client'
import { createClient } from '@/utils/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  // use supabase...
}
```

### Server Component Client (`server.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
```

**Usage in Server Components:**
```typescript
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase.from('todos').select()
  return (...)
}
```

### Middleware Client (`middleware.ts`)

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value, options)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  });

  return supabaseResponse
};
```

**Usage in middleware:**
```typescript
import { createClient } from '@/utils/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseResponse = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  // Auth guard
  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
```

---

## 3. Auth Flow (Admin-Created Accounts)

### Key Principles
1. **No self-signup** — Admin creates all staff accounts
2. **Email/password** — Staff login with credentials
3. **Role-based redirect** — After login, redirect to role-specific dashboard

### Signup Flow (Admin Action)
```typescript
// Admin creates staff account
async function createStaffAccount(email: string, password: string, role: string) {
  // 1. Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  // 2. Create user record with role
  await supabase.from('users').insert({
    id: data.user!.id,
    name: name,
    role: role,
    status: 'active'
  })
}
```

### Login Flow (Staff)
```typescript
// Login page
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (data.user) {
    // Get role
    const { data: staff } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    // Redirect based on role
    const dashboards = {
      admin: '/admin',
      gudang: '/gudang',
      penjahit: '/penjahit',
      finance: '/finance',
      installer: '/installer',
      owner: '/owner'
    }

    redirect(dashboards[staff.role])
  }
}
```

### Auth Guard (Middleware)
```typescript
// middleware.ts — protect all dashboard routes
export async function middleware(request: NextRequest) {
  const supabaseResponse = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/admin') ||
                           request.nextUrl.pathname.startsWith('/gudang') ||
                           request.nextUrl.pathname.startsWith('/penjahit') ||
                           request.nextUrl.pathname.startsWith('/finance') ||
                           request.nextUrl.pathname.startsWith('/installer') ||
                           request.nextUrl.pathname.startsWith('/owner')

  const isPublicRoute = ['/login', '/register', '/'].includes(
    request.nextUrl.pathname
  )

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)']
}
```

---

## 4. Image Compression + Local Upload

### ⚠️ Local Storage (NOT Supabase Storage)
All file uploads go to `public/uploads/` on the server. This avoids Supabase Storage costs for large catalogs (2500+ products).

### Install
```bash
npm install browser-image-compression next-themes
```

### Upload Helper (`src/lib/upload.ts`)
```typescript
import { uploadToLocal } from '@/lib/upload'

// Usage
const result = await uploadToLocal(file, 'banners', { compress: true, maxSizeMB: 2 })
// Returns: { url: '/uploads/banners/123456-abc123.jpg', filename, size, type }
```

### API Route
- `POST /api/upload` — accepts FormData with `file` and `folder` fields

### Storage Structure
```
public/uploads/
├── products/       # Product catalog images (5MB → 1MB)
├── banners/        # Landing page hero banners (5MB → 2MB)
├── portfolio/      # Blog/portfolio post images (2MB → 1MB)
├── evidence/       # QC, return, installation photos (2MB → 1MB)
├── documents/      # PDFs, official documents (5MB)
├── order_progress/ # Order status tracking photos (2MB → 1MB)
├── returns/        # Return verification photos (2MB → 1MB)
├── qc/             # QC evidence photos (2MB → 1MB)
└── install/        # Installation completion photos (2MB → 1MB)
```

---

## 5. Invoice & Packing List PDF Generation

### Install
```bash
npm install jspdf jspdf-autotable
```

### Usage (`src/lib/invoice.ts`)
```typescript
import { generateInvoicePDF, generatePackingListPDF } from '@/lib/invoice'

// Generate invoice
generateInvoicePDF({ order, orderNumber })

// Generate packing list
generatePackingListPDF({ order, orderNumber, courier, waybill })
```

### Functions
- `generateInvoicePDF({ order, orderNumber })` — Orange header, bill-to info, item table with DP/Lunas/Total footer
- `generatePackingListPDF({ order, orderNumber, courier?, waybill? })` — Blue header, weight calculation (meter × 0.4kg), readiness per item

---

## 6. HPP Calculator (BOM-Based + Manual Override)

### Concept
```typescript
type HPPMethod = 'auto' | 'manual'

interface HPPResult {
  material_cost: number
  production_cost: number
  total_hpp: number
  markup_percentage: number
  harga_jual: number
}

// Auto-calculate from BOM
function calculateHPP(productId: string): HPPResult {
  const bom = getBOM(productId) // materials + qty_per_unit

  const material_cost = bom.reduce((sum, item) => {
    return sum + (item.qty_per_unit * item.material.cost_per_unit)
  }, 0)

  const production_cost = calculateProductionCost(productId)

  const total_hpp = material_cost + production_cost

  return {
    material_cost,
    production_cost,
    total_hpp,
    markup_percentage: 30, // default
    harga_jual: total_hpp * 1.3
  }
}

// Manual override
interface Product {
  hpp_calculated: number  // auto
  hpp_manual: number | null  // override
  harga_jual: number  // = hpp_manual ?? hpp_calculated
}
```

### Production Cost Calculation
```typescript
// Rate per meter (Finance sets this)
const RATE_PER_METER = {
  gorden: 5000,    // Rp 5,000/meter
  vitras: 3000,    // Rp 3,000/meter
  roman: 7000,     // Rp 7,000/meter
  kupu_kupu: 6000  // Rp 6,000/meter
}

function calculateProductionCost(orderItem): number {
  let total = 0
  if (orderItem.meter_gorden > 0)
    total += orderItem.meter_gorden * RATE_PER_METER.gorden
  if (orderItem.meter_vitras > 0)
    total += orderItem.meter_vitras * RATE_PER_METER.vitras
  if (orderItem.meter_roman > 0)
    total += orderItem.meter_roman * RATE_PER_METER.roman
  if (orderItem.meter_kupu_kupu > 0)
    total += orderItem.meter_kupu_kupu * RATE_PER_METER.kupu_kupu

  if (orderItem.poni_lurus) total += 3000
  if (orderItem.poni_gel) total += 5000

  return total
}
```

---

## 7. Stock Management (Gudang vs Toko)

### Stock Locations

| Location | Purpose | What stored |
|----------|---------|-------------|
| `stock_gudang` | Warehouse (production) | Raw materials, WIP |
| `stock_toko` | Retail store (ready) | Finished goods, ready to ship |

### Materials
```sql
materials (
  stock_gudang NUMERIC DEFAULT 0,
  stock_toko NUMERIC DEFAULT 0
)
```

### Products (Finished Goods)
```sql
products (
  stock_toko NUMERIC DEFAULT 0  -- Only finished goods, no stock_gudang
)
```

### Stock Flow

```
IN (from supplier):
  inventory_movements (type: 'in') → materials.stock_gudang increases

OUT (used for orders):
  inventory_movements (type: 'out') → materials.stock_gudang decreases
  BOM lookup → auto-allocate materials from stock

TRANSFER (Gudang → Toko):
  inventory_movements (type: 'transfer_out') → stock_gudang decreases
  inventory_movements (type: 'transfer_in') → stock_toko increases

Production complete → products.stock_toko += 1
Order fulfilled → products.stock_toko -= 1
```

---

## 8. Payment Flows

### Customer Payment (Xendit)
```
Customer pays via Xendit (VA/QRIS)
    ↓
Xendit webhook → /api/webhooks/xendit
    ↓
Update payments table (type: 'dp' or 'lunas')
    ↓
Check: dp_amount + lunas_amount >= total_amount?
    ↓
payment_status = 'paid'
Payment gate PASSED
```

### Supplier Payment (Manual)
```
Supplier sends invoice
    ↓
Admin uploads invoice to PO record
    ↓
Finance does manual bank transfer
    ↓
Finance updates PO:
  - status: 'paid'
  - paid_at: now
  - proof_of_payment: upload (screenshot/receipt)
```

---

## 9. Dashboard Summary

| Dashboard | Role | URL |
|-----------|------|-----|
| Admin | admin | /admin |
| Gudang | gudang | /gudang |
| Penjahit | penjahit | /penjahit |
| Finance | finance | /finance |
| Installer | installer | /installer |
| Owner | owner | /owner |

**Gudang handles:** Production queue, Laundry + Steam (same page, tabs), Stock, Retur, Lembur, Low stock alerts

---

## 10. Common Tasks

### Create Supabase Migration
```bash
# Create migration file
touch supabase/migrations/XXX_description.sql

# Run via Supabase dashboard or CLI
supabase db push
```

### Add Shadcn Component
```bash
npx shadcn@latest add button card input label table badge alert
```

### Add New Staff Account (Admin only)
```typescript
async function createStaff(email: string, password: string, name: string, role: Role) {
  // 1. Create auth user
  const { data } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  // 2. Create user record
  await supabase.from('users').insert({
    id: data.user!.id,
    name,
    role,
    status: 'active'
  })
}
```

### Upload Image (Local Storage)
```typescript
import { uploadToLocal } from '@/lib/upload'

// Usage
const result = await uploadToLocal(file, 'evidence', { compress: true, maxSizeMB: 1 })
// Returns: { url: '/uploads/evidence/123456-abc123.jpg', filename, size, type }
```

---

## 11. Dark Mode

### Install
```bash
npm install next-themes
```

### Setup in layout.tsx
```typescript
import { ThemeProvider } from "next-themes"

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Toggle Component
```typescript
// src/components/ui/ThemeToggle.tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  )
}
```

### CSS Variables
Dark mode uses `.dark` class on `<html>` with CSS variable overrides in `globals.css`.

---

## 12. PWA Support

### Files
- `public/manifest.json` — App manifest (name, icons, display: standalone)
- `public/sw.js` — Service worker for offline caching

### Service Worker Strategy
- Page navigations: Network first, fallback to cache
- Static assets: Cache first
- API calls: Network only
- Offline fallback: cached `/` page

### Installability
```json
{
  "name": "KJ Homedecor",
  "short_name": "KJ Home",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#cc7030"
}
```

---

## 13. Error Handling

### React ErrorBoundary
```typescript
// src/components/ErrorBoundary.tsx
// Wraps app (root + dashboard layout) for graceful error handling
// Prevents full-page crashes on component errors
```

### API Response Format (Standardized)
```typescript
// Success: { data: T, error: null }
// Error: { data: null, error: { message: string } }

// All API routes use this format: orders, products, customers,
// materials, install-bookings, purchase-requests, suppliers,
// upload, journal, landing-settings, xendit webhook
```

---

## 14. API Conventions

### Zod Validation
POST routes use `safeParse()` with Zod schemas. Error messages use `parsed.error.issues[0].message` (Zod v4).

### Endpoints
```
GET    /api/[resource]         List (pagination where implemented)
POST   /api/[resource]         Create (Zod validated)
GET    /api/[resource]/[id]   Get one
PUT    /api/[resource]/[id]   Update
DELETE /api/[resource]/[id]   Delete

POST /api/upload  (FormData: file, folder) — requires auth
```

---

## 15. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/invoice.ts` | Invoice & Packing List PDF generation |
| `src/lib/upload.ts` | Local upload helper with auto-compression |
| `src/components/ErrorBoundary.tsx` | React ErrorBoundary component |
| `src/components/ui/ThemeToggle.tsx` | Dark mode toggle |
| `src/components/dashboard/DashboardTopNav.tsx` | Dashboard navbar |
| `src/components/ui/BookingCalendar.tsx` | Public booking calendar component |
| `src/components/ui/skeleton.tsx` | Loading skeletons (TableSkeleton, StatCardSkeleton, CardGridSkeleton) |
| `src/components/ui/EmptyState.tsx` | Empty state illustrations |

---

*Last updated: 2026-05-28*
*Follow this guide exactly for consistent setup*
-- KJ Homedecor — Initial Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (staff accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  parent_id   UUID REFERENCES public.categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  contact     TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MATERIALS (raw materials / BOM)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'meter' CHECK (unit IN ('meter','pcs','set','glb','kg')),
  cost_per_unit     NUMERIC NOT NULL DEFAULT 0,
  stock_gudang      NUMERIC NOT NULL DEFAULT 0,
  stock_toko        NUMERIC NOT NULL DEFAULT 0,
  min_stock_level   NUMERIC NOT NULL DEFAULT 0,
  supplier_id       UUID REFERENCES public.suppliers(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category_id     UUID REFERENCES public.categories(id),
  sku             TEXT,
  kode_kain       TEXT,
  price           NUMERIC NOT NULL DEFAULT 0,
  cost            NUMERIC DEFAULT 0,
  stock_toko      NUMERIC NOT NULL DEFAULT 0,
  is_custom       BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  images          JSONB DEFAULT '[]',
  hpp_calculated  NUMERIC DEFAULT 0,
  hpp_manual      NUMERIC,
  harga_jual      NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOM (Bill of Materials)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bom (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty_per_unit  NUMERIC NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id_external   TEXT,
  source              TEXT NOT NULL DEFAULT 'offline'
    CHECK (source IN ('shopee','tokopedia','tiktok','offline','landing_page')),
  customer_id         UUID REFERENCES public.customers(id),
  classification      TEXT NOT NULL DEFAULT 'kirim'
    CHECK (classification IN ('kirim','pasang')),
  status              TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','sorted','payment_ok','production','ready','done')),
  total_amount        NUMERIC NOT NULL DEFAULT 0,
  dp_amount           NUMERIC NOT NULL DEFAULT 0,
  lunas_amount        NUMERIC NOT NULL DEFAULT 0,
  shipping_cost       NUMERIC DEFAULT 0,
  payment_status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','partial','paid')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES public.products(id),
  qty               INTEGER NOT NULL DEFAULT 1,
  price             NUMERIC NOT NULL DEFAULT 0,
  size              TEXT,
  custom_specs      TEXT,
  meter_gorden      NUMERIC DEFAULT 0,
  meter_vitras      NUMERIC DEFAULT 0,
  meter_roman       NUMERIC DEFAULT 0,
  meter_kupu_kupu   NUMERIC DEFAULT 0,
  poni_lurus        BOOLEAN DEFAULT FALSE,
  poni_gel          BOOLEAN DEFAULT FALSE,
  smokering_color   TEXT,
  ready             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION JOBS (Penjahit assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  penjahit_id       UUID REFERENCES public.users(id),
  status            TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','in_progress','done')),
  meter_gorden      NUMERIC DEFAULT 0,
  meter_vitras      NUMERIC DEFAULT 0,
  meter_roman       NUMERIC DEFAULT 0,
  meter_kupu_kupu   NUMERIC DEFAULT 0,
  poni_lurus        BOOLEAN DEFAULT FALSE,
  poni_gel          BOOLEAN DEFAULT FALSE,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION REPORTS (Monthly penjahit pay)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_reports (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  penjahit_id             UUID NOT NULL REFERENCES public.users(id),
  month                   INTEGER NOT NULL,
  year                    INTEGER NOT NULL,
  meter_total_gorden      NUMERIC NOT NULL DEFAULT 0,
  meter_total_vitras      NUMERIC NOT NULL DEFAULT 0,
  meter_total_roman       NUMERIC NOT NULL DEFAULT 0,
  meter_total_kupu_kupu   NUMERIC NOT NULL DEFAULT 0,
  jobs_done               INTEGER NOT NULL DEFAULT 0,
  rate_per_meter          JSONB NOT NULL DEFAULT '{"gorden":5000,"vitras":3000,"roman":7000,"kupu_kupu":6000}',
  total_upah              NUMERIC NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(penjahit_id, month, year)
);

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id     UUID NOT NULL REFERENCES public.materials(id),
  type            TEXT NOT NULL CHECK (type IN ('in','out','transfer_in','transfer_out')),
  qty             NUMERIC NOT NULL,
  from_location   TEXT CHECK (from_location IN ('gudang','toko')),
  to_location     TEXT CHECK (to_location IN ('gudang','toko')),
  reason          TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOW STOCK ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id   UUID NOT NULL REFERENCES public.materials(id),
  current_qty   NUMERIC NOT NULL,
  min_qty       NUMERIC NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- ============================================================
-- PURCHASE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id     UUID NOT NULL REFERENCES public.materials(id),
  qty             NUMERIC NOT NULL,
  estimated_cost  NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_by      UUID REFERENCES public.users(id),
  approved_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id               UUID REFERENCES public.purchase_requests(id),
  supplier_id         UUID REFERENCES public.suppliers(id),
  actual_cost         NUMERIC NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','received','paid')),
  invoice_document    TEXT,
  proof_of_payment    TEXT,
  paid_at             TIMESTAMPTZ,
  paid_by             UUID REFERENCES public.users(id),
  received_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSTALL BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.install_bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES public.orders(id),
  customer_id   UUID REFERENCES public.customers(id),
  address       TEXT NOT NULL,
  date          DATE NOT NULL,
  time          TIME,
  type          TEXT NOT NULL DEFAULT 'pasang' CHECK (type IN ('survey','pasang')),
  status        TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','done','cancelled')),
  installer_id  UUID REFERENCES public.users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSTALL CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.install_checklists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES public.install_bookings(id) ON DELETE CASCADE,
  items           JSONB NOT NULL DEFAULT '[]',
  completed_at    TIMESTAMPTZ,
  photo_evidence  JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('dp','lunas')),
  amount        NUMERIC NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_by   UUID REFERENCES public.users(id),
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JOURNAL ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date          DATE NOT NULL,
  account       TEXT NOT NULL,
  description   TEXT,
  debit         NUMERIC NOT NULL DEFAULT 0,
  credit        NUMERIC NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BANNERS (Landing page hero carousel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url   TEXT NOT NULL,
  title       TEXT,
  subtitle    TEXT,
  link_url    TEXT,
  sequence    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PORTFOLIO POSTS (Blog)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  images      JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEMBUR RECORDS (Overtime)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lembur_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_name  TEXT NOT NULL,
  date        DATE NOT NULL,
  time_start  TIME NOT NULL,
  time_end    TIME NOT NULL,
  total_hours NUMERIC NOT NULL,
  notes       TEXT,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QC RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.qc_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id),
  order_item_id   UUID REFERENCES public.order_items(id),
  result          TEXT NOT NULL CHECK (result IN ('pass','fail')),
  fail_reason     TEXT,
  photo_evidence  JSONB DEFAULT '[]',
  revision_notes  TEXT,
  checked_by      UUID REFERENCES public.users(id),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LAUNDRY RECORDS (Steam)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.laundry_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE NOT NULL,
  customer_name   TEXT NOT NULL,
  kg              NUMERIC DEFAULT 0,
  meter           NUMERIC DEFAULT 0,
  description     TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembur_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_records ENABLE ROW LEVEL SECURITY;

-- Authenticated staff can read/write everything (role enforcement done in app layer)
CREATE POLICY "Authenticated staff full access" ON public.users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated staff full access" ON public.customers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can read categories" ON public.categories
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write categories" ON public.categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can read products" ON public.products
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write products" ON public.products
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can read banners" ON public.banners
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Auth can write banners" ON public.banners
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can read portfolio" ON public.portfolio_posts
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write portfolio" ON public.portfolio_posts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated staff access" ON public.materials
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.suppliers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.bom
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.order_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.production_jobs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.production_reports
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.inventory_movements
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.low_stock_alerts
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.purchase_requests
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.purchase_orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.install_bookings
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.install_checklists
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.journal_entries
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.lembur_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.qc_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.laundry_records
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Storage settings)
-- ============================================================
-- products  (public)
-- banners   (public)
-- portfolio (public)
-- evidence  (private, authenticated)
-- avatars   (private, authenticated)

-- ============================================================
-- SEED DATA — Default categories
-- ============================================================
INSERT INTO public.categories (name, slug) VALUES
  ('Gorden', 'gorden'),
  ('Vitras', 'vitras'),
  ('Roman', 'roman'),
  ('Kupu-Kupu', 'kupu-kupu'),
  ('Kait & Aksesoris', 'kait-aksesoris'),
  ('Custom', 'custom')
ON CONFLICT (slug) DO NOTHING;

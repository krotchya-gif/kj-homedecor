-- ============================================================
-- KJ Homedecor — Full Schema (Konsolidasi 001–058)
-- ============================================================
-- Dibuat untuk migrasi ke akun Supabase baru.
-- Menggabungkan semua 59 file migration menjadi 1 file SQL.
-- ============================================================

-- ============================================================
-- EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- USERS (staff accounts)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','laundry')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  avatar_url  TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  parent_id   UUID REFERENCES public.categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  contact     TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MATERIALS (raw materials / BOM)
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

-- PRODUCTS
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
  style_variants  TEXT[],
  smokring_colors TEXT[],
  color_variants  TEXT[],
  dimension_p     NUMERIC,
  dimension_l     NUMERIC,
  dimension_t     NUMERIC,
  weight          NUMERIC,
  is_catalog_visible BOOLEAN NOT NULL DEFAULT TRUE,
  product_type    VARCHAR(20) DEFAULT 'perabot',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOM (Bill of Materials)
CREATE TABLE IF NOT EXISTS public.bom (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  qty_per_unit  NUMERIC NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, material_id)
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT UNIQUE,
  order_id_external   TEXT,
  source              TEXT NOT NULL DEFAULT 'offline' CHECK (source IN ('shopee','tokopedia','tiktok','offline','landing_page')),
  customer_id         UUID REFERENCES public.customers(id),
  classification      TEXT NOT NULL DEFAULT 'kirim' CHECK (classification IN ('kirim','pasang')),
  status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','sorted','production','steam','ready','payment_ok','packed','shipped','scheduled','installing','done','returned','cancelled')),
  total_amount        NUMERIC NOT NULL DEFAULT 0,
  dp_amount           NUMERIC NOT NULL DEFAULT 0,
  lunas_amount        NUMERIC NOT NULL DEFAULT 0,
  shipping_cost       NUMERIC DEFAULT 0,
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid')),
  notes               TEXT,
  admin_notes         TEXT,
  tracking_number     TEXT,
  courier             TEXT,
  packed_at           TIMESTAMPTZ,
  packed_by           UUID REFERENCES public.users(id),
  shipped_at          TIMESTAMPTZ,
  shipped_by          UUID REFERENCES public.users(id),
  installed_at        TIMESTAMPTZ,
  installed_by        UUID REFERENCES public.users(id),
  return_reason       TEXT,
  returned_at         TIMESTAMPTZ,
  estimated_completion         TIMESTAMPTZ,
  scheduled_installation_date  DATE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER LOGS (audit trail)
CREATE TABLE IF NOT EXISTS public.order_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN (
    'created','sorted','payment_approved','production_started','production_done',
    'qc_pass','qc_fail','ready','packed','shipped','installed','done',
    'return_initiated','return_stock_in','return_disposed','cancelled',
    'penjahit_assigned','install_started','install_done','install_revision',
    'steam_qc_pass','steam_revision_requeue','order_deleted',
    'payment_input','payment_added','refund_issued'
  )),
  notes       TEXT,
  staff_id    UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER ITEMS
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
  returned_at       TIMESTAMPTZ,
  return_reason     TEXT,
  meter             NUMERIC DEFAULT 0,
  style_type        TEXT,
  smokring_color    TEXT,
  variant_color     TEXT,
  variant_size      TEXT,
  dimension_p       NUMERIC,
  dimension_l       NUMERIC,
  dimension_t       NUMERIC,
  weight            NUMERIC,
  item_type         TEXT DEFAULT 'gorden' CHECK (item_type IN ('gorden','perabot','laundry')),
  linked_laundry_id UUID REFERENCES public.laundry_orders(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTION JOBS (Penjahit assignments)
CREATE TABLE IF NOT EXISTS public.production_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  penjahit_id       UUID REFERENCES public.users(id),
  status            TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','done')),
  meter_gorden      NUMERIC DEFAULT 0,
  meter_vitras      NUMERIC DEFAULT 0,
  meter_roman       NUMERIC DEFAULT 0,
  meter_kupu_kupu   NUMERIC DEFAULT 0,
  poni_lurus        BOOLEAN DEFAULT FALSE,
  poni_gel          BOOLEAN DEFAULT FALSE,
  revision_of       UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  revision_round    INTEGER NOT NULL DEFAULT 0,
  revision_reason   TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTION REPORTS (Monthly penjahit pay)
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
  production_job_id       UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVENTORY MOVEMENTS
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id         UUID REFERENCES public.materials(id),
  product_id          UUID REFERENCES public.products(id),
  type                TEXT NOT NULL CHECK (type IN ('in','out','transfer_in','transfer_out','return_in','dispose','adjustment')),
  qty                 NUMERIC NOT NULL,
  from_location       TEXT CHECK (from_location IN ('gudang','toko')),
  to_location         TEXT CHECK (to_location IN ('gudang','toko')),
  reason              TEXT,
  order_id            UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  production_job_id   UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LOW STOCK ALERTS
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id   UUID NOT NULL REFERENCES public.materials(id),
  current_qty   NUMERIC NOT NULL,
  min_qty       NUMERIC NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- PURCHASE REQUESTS
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id     UUID NOT NULL REFERENCES public.materials(id),
  qty             NUMERIC NOT NULL,
  estimated_cost  NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by      UUID REFERENCES public.users(id),
  approved_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id               UUID REFERENCES public.purchase_requests(id),
  supplier_id         UUID REFERENCES public.suppliers(id),
  actual_cost         NUMERIC NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','received','paid')),
  invoice_document    TEXT,
  proof_of_payment    TEXT,
  paid_at             TIMESTAMPTZ,
  paid_by             UUID REFERENCES public.users(id),
  received_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSTALL BOOKINGS
CREATE TABLE IF NOT EXISTS public.install_bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID REFERENCES public.orders(id),
  customer_id       UUID REFERENCES public.customers(id),
  customer_name     TEXT,
  customer_phone    TEXT,
  address           TEXT,
  date              DATE,
  time              TIME,
  source            TEXT DEFAULT 'website' CHECK (source IN ('website','manual','whatsapp')),
  type              TEXT NOT NULL DEFAULT 'pasang' CHECK (type IN ('survey','pasang')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','done','revision','cancelled')),
  installer_id      UUID REFERENCES public.users(id),
  scheduled_date    DATE,
  scheduled_time    TIME,
  notes             TEXT,
  revision_reason   TEXT,
  revision_photos   TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INSTALL CHECKLISTS
CREATE TABLE IF NOT EXISTS public.install_checklists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES public.install_bookings(id) ON DELETE CASCADE,
  items           JSONB NOT NULL DEFAULT '[]',
  completed_at    TIMESTAMPTZ,
  photo_evidence  JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('dp','lunas','refund')),
  amount            NUMERIC NOT NULL,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_by       UUID REFERENCES public.users(id),
  verified_at       TIMESTAMPTZ,
  xendit_payment_id TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RETURNS
CREATE TABLE IF NOT EXISTS public.returns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id   UUID REFERENCES public.order_items(id),
  reason          TEXT NOT NULL,
  condition       TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good','damaged')),
  qty             NUMERIC DEFAULT 1,
  refund_amount   NUMERIC DEFAULT 0,
  refund_status   TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending','approved','rejected','completed')),
  approved_by     UUID REFERENCES public.users(id),
  created_by      UUID REFERENCES public.users(id),
  resolved_at     TIMESTAMPTZ,
  photo_evidence  TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BANNERS (Landing page hero carousel)
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

-- PORTFOLIO POSTS (Blog)
CREATE TABLE IF NOT EXISTS public.portfolio_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  images      JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LEMBUR RECORDS (Overtime)
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

-- QC RECORDS
CREATE TABLE IF NOT EXISTS public.qc_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id),
  order_item_id   UUID REFERENCES public.order_items(id),
  result          TEXT NOT NULL CHECK (result IN ('pass','fail','revision')),
  fail_reason     TEXT,
  photo_evidence  JSONB DEFAULT '[]',
  revision_notes  TEXT,
  checked_by      UUID REFERENCES public.users(id),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LAUNDRY RECORDS (Legacy)
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

-- LAUNDRY ORDERS
CREATE TABLE IF NOT EXISTS public.laundry_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  order_id        UUID REFERENCES public.orders(id),
  kg              NUMERIC NOT NULL,
  meter           NUMERIC DEFAULT 0,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  assigned_to     UUID REFERENCES public.users(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LAUNDRY RATES
CREATE TABLE IF NOT EXISTS public.laundry_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  rate_per_kg     NUMERIC NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LAUNDRY PAYROLL
CREATE TABLE IF NOT EXISTS public.laundry_payroll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES public.users(id),
  period_month    INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER NOT NULL,
  total_kg        NUMERIC NOT NULL DEFAULT 0,
  total_rate      NUMERIC NOT NULL DEFAULT 0,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, period_month, period_year)
);

-- ============================================================
-- 2. LANDING SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.landing_settings (
  id TEXT PRIMARY KEY DEFAULT 'hero',
  hero_title TEXT DEFAULT 'Percantik Ruanganmu dengan Gorden Premium',
  hero_subtitle TEXT DEFAULT 'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi. Pemasangan profesional ke seluruh Jabodetabek.',
  hero_cta_text TEXT DEFAULT 'Lihat Katalog',
  hero_cta_link TEXT DEFAULT '#products',
  whatsapp_number TEXT DEFAULT '6281234567890',
  whatsapp_message TEXT DEFAULT 'Halo KJ Homedecor, saya ingin konsultasi gorden',
  trust_badges JSONB DEFAULT '[{"icon":"Star","label":"500+ Pelanggan Puas"},{"icon":"Shield","label":"Garansi Kualitas"},{"icon":"Truck","label":"Pasang Se-Jabodetabek"}]',
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  shopee TEXT,
  tokopedia TEXT,
  address TEXT DEFAULT 'Jakarta, Indonesia',
  phone TEXT DEFAULT '+62 812-3456-7890',
  seo_pixel_id TEXT,
  seo_ga4_id TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  seo_og_image TEXT,
  hero_image_url TEXT,
  hero_video_url TEXT,
  categories_label TEXT,
  categories_title TEXT,
  categories_subtitle TEXT,
  whyus_label TEXT,
  whyus_title TEXT,
  whyus_subtitle TEXT,
  whyus_card1_title TEXT,
  whyus_card1_desc TEXT,
  whyus_card2_title TEXT,
  whyus_card2_desc TEXT,
  whyus_card3_title TEXT,
  whyus_card3_desc TEXT,
  whyus_card4_title TEXT,
  whyus_card4_desc TEXT,
  portfolio_label TEXT,
  portfolio_title TEXT,
  portfolio_subtitle TEXT,
  cta_badge TEXT,
  cta_title TEXT,
  cta_subtitle TEXT,
  theme_primary_color TEXT DEFAULT '#DDC0B4',
  theme_secondary_color TEXT DEFAULT '#C9A98C',
  theme_accent_color TEXT DEFAULT '#f4a857',
  theme_background_color TEXT DEFAULT '#FAF5EE',
  theme_text_color TEXT DEFAULT '#2B2321',
  theme_preset TEXT DEFAULT 'default' CHECK (theme_preset IN ('default','modern','gold','green','purple','custom')),
  hero_background_image TEXT,
  hero_background_overlay_opacity NUMERIC DEFAULT 0.75 CHECK (hero_background_overlay_opacity >= 0 AND hero_background_overlay_opacity <= 1),
  theme_border_radius TEXT DEFAULT '0.5rem',
  theme_font_heading TEXT DEFAULT 'Playfair Display',
  theme_font_body TEXT DEFAULT 'Inter',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. BUSINESS LOGIC TABLES
-- ============================================================

-- STEAM JOBS (Post-production QC)
CREATE TABLE IF NOT EXISTS public.steam_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','revision')),
  result            TEXT CHECK (result IN ('pass','fail')),
  fail_reason       TEXT,
  notes             TEXT,
  checked_by        UUID REFERENCES public.users(id),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STYLE RATES
CREATE TABLE IF NOT EXISTS public.style_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style TEXT UNIQUE NOT NULL,
  rate_per_meter NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ORDER PREPARATION CHECKLISTS
CREATE TABLE IF NOT EXISTS public.order_preparation_checklists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  items         JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER PROGRESS PHOTOS
CREATE TABLE IF NOT EXISTS public.order_progress_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  photo_url   TEXT NOT NULL,
  notes       TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MATERIAL PRICE HISTORY
CREATE TABLE IF NOT EXISTS public.material_price_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id   UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  price         NUMERIC NOT NULL CHECK (price >= 0),
  notes         TEXT,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER MATERIAL CONSUMPTION (HPP traceability)
CREATE TABLE IF NOT EXISTS public.order_material_consumption (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES public.materials(id),
  qty_consumed      NUMERIC NOT NULL,
  consumed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_by       UUID REFERENCES public.users(id),
  notes             TEXT,
  UNIQUE (production_job_id, material_id)
);

-- ============================================================
-- 4. ACCOUNTING TABLES
-- ============================================================

-- ACCOUNT CATEGORIES
CREATE TABLE IF NOT EXISTS public.account_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACCOUNTS (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  category_id     UUID REFERENCES public.account_categories(id),
  parent_id       UUID REFERENCES public.accounts(id),
  is_cash_account BOOLEAN DEFAULT false,
  balance         NUMERIC DEFAULT 0,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACCOUNT MAPPINGS
CREATE TABLE IF NOT EXISTS public.account_mappings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type  VARCHAR(50) NOT NULL UNIQUE,
  debit_account_id  UUID REFERENCES public.accounts(id),
  credit_account_id UUID REFERENCES public.accounts(id),
  description       TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  total_debit     NUMERIC DEFAULT 0,
  total_credit    NUMERIC DEFAULT 0,
  is_auto         BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JOURNAL LINES
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id        UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES public.accounts(id),
  debit           NUMERIC DEFAULT 0,
  credit          NUMERIC DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HUTANG (Accounts Payable)
CREATE TABLE IF NOT EXISTS public.hutang (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID REFERENCES public.suppliers(id),
  invoice_number  VARCHAR(50),
  invoice_date    DATE,
  due_date        DATE,
  amount          NUMERIC NOT NULL DEFAULT 0,
  paid_amount     NUMERIC DEFAULT 0,
  return_amount   NUMERIC DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PIUTANG (Accounts Receivable)
CREATE TABLE IF NOT EXISTS public.piutang (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES public.customers(id),
  channel         VARCHAR(50),
  invoice_number  VARCHAR(50),
  invoice_date    DATE,
  due_date        DATE,
  amount          NUMERIC NOT NULL DEFAULT 0,
  paid_amount     NUMERIC DEFAULT 0,
  return_amount   NUMERIC DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
  order_id        UUID REFERENCES public.orders(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CASH ACCOUNTS
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID REFERENCES public.accounts(id),
  bank_name       VARCHAR(100),
  account_number  VARCHAR(50),
  account_holder  VARCHAR(255),
  balance         NUMERIC DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ASSETS (Fixed Asset Management)
CREATE TABLE IF NOT EXISTS public.assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(20) UNIQUE,
  name                VARCHAR(255) NOT NULL,
  category            VARCHAR(100),
  location            VARCHAR(255),
  purchase_date       DATE,
  purchase_value      NUMERIC,
  depreciation_rate   NUMERIC DEFAULT 0,
  depreciation_method VARCHAR(20) DEFAULT 'straight-line' CHECK (depreciation_method IN ('straight-line','declining-balance')),
  useful_life_years   NUMERIC DEFAULT 0,
  current_value       NUMERIC,
  accumulated_depreciation NUMERIC DEFAULT 0,
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','disposed','sold')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STOCK OPNAME SESSIONS
CREATE TABLE IF NOT EXISTS public.stock_opname_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','submitted','approved','cancelled')),
  created_by  UUID REFERENCES public.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ
);

-- STOCK OPNAME ITEMS
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES public.stock_opname_sessions(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES public.materials(id),
  system_qty        NUMERIC NOT NULL DEFAULT 0,
  counted_qty       NUMERIC NOT NULL DEFAULT 0,
  difference        NUMERIC NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_packed_at ON public.orders(packed_at);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON public.orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_classification ON public.orders(classification);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_style_type ON public.order_items(style_type);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_color ON public.order_items(variant_color);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_size ON public.order_items(variant_size);

-- Order logs
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_action ON public.order_logs(action);

-- Production jobs
CREATE INDEX IF NOT EXISTS idx_production_jobs_order_id ON public.production_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_penjahit_id ON public.production_jobs(penjahit_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_revision_of ON public.production_jobs(revision_of);
CREATE INDEX IF NOT EXISTS idx_production_jobs_revision_round ON public.production_jobs(revision_round);

-- Production reports
CREATE INDEX IF NOT EXISTS idx_production_reports_job_id ON public.production_reports(production_job_id) WHERE production_job_id IS NOT NULL;

-- Inventory movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id ON public.inventory_movements(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_production_job_id ON public.inventory_movements(production_job_id) WHERE production_job_id IS NOT NULL;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_xendit_id ON public.payments(xendit_payment_id) WHERE xendit_payment_id IS NOT NULL;

-- Returns
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(refund_status);

-- QC records
CREATE INDEX IF NOT EXISTS idx_qc_records_order_id ON public.qc_records(order_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_style_variants ON public.products USING GIN(style_variants);
CREATE INDEX IF NOT EXISTS idx_products_color_variants ON public.products USING GIN(color_variants);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

-- Install bookings
CREATE INDEX IF NOT EXISTS idx_install_bookings_status ON public.install_bookings(status);
CREATE INDEX IF NOT EXISTS idx_install_bookings_scheduled_date ON public.install_bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_install_bookings_type ON public.install_bookings(type);
CREATE INDEX IF NOT EXISTS idx_install_bookings_created_at ON public.install_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ib_revision_status ON public.install_bookings(status) WHERE status = 'revision';

-- Steam jobs
CREATE INDEX IF NOT EXISTS idx_steam_jobs_order_id ON public.steam_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_steam_jobs_status ON public.steam_jobs(status);

-- Laundry
CREATE INDEX IF NOT EXISTS idx_laundry_orders_status ON public.laundry_orders(status);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_assigned_to ON public.laundry_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_received_at ON public.laundry_orders(received_at);
CREATE INDEX IF NOT EXISTS idx_laundry_payroll_staff_id ON public.laundry_payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_laundry_payroll_period ON public.laundry_payroll(period_year, period_month);

-- Order progress photos
CREATE INDEX IF NOT EXISTS idx_order_progress_photos_order_id ON public.order_progress_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_order_progress_photos_stage ON public.order_progress_photos(stage);

-- Material price history
CREATE INDEX IF NOT EXISTS idx_mph_material_recorded ON public.material_price_history(material_id, recorded_at DESC);

-- Order material consumption
CREATE INDEX IF NOT EXISTS idx_omc_order_id ON public.order_material_consumption(order_id);
CREATE INDEX IF NOT EXISTS idx_omc_production_job_id ON public.order_material_consumption(production_job_id);
CREATE INDEX IF NOT EXISTS idx_omc_material_id ON public.order_material_consumption(material_id);

-- Accounting
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON public.accounts(code);
CREATE INDEX IF NOT EXISTS idx_hutang_supplier ON public.hutang(supplier_id);
CREATE INDEX IF NOT EXISTS idx_hutang_status ON public.hutang(status);
CREATE INDEX IF NOT EXISTS idx_piutang_customer ON public.piutang(customer_id);
CREATE INDEX IF NOT EXISTS idx_piutang_channel ON public.piutang(channel);
CREATE INDEX IF NOT EXISTS idx_piutang_order ON public.piutang(order_id);
CREATE INDEX IF NOT EXISTS idx_piutang_status ON public.piutang(status);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_bank ON public.cash_accounts(bank_name);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON public.journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_id);

-- ============================================================
-- 6. RPC FUNCTIONS
-- ============================================================

-- generate_order_number: ORD-YYYY-NNNN sequential format
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(order_number FROM 'ORD-\d{4}-(\d+)$')::int)
       FROM orders WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
      0) + 1 AS TEXT), 4, '0');
$$ LANGUAGE SQL;

-- increment_stock_toko: add stock to products
CREATE OR REPLACE FUNCTION increment_stock_toko(product_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock_toko = COALESCE(stock_toko, 0) + amount
  WHERE id = product_id;
END;
$$;

-- decrement_stock_gudang: subtract stock from materials with floor at 0
CREATE OR REPLACE FUNCTION decrement_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE materials
  SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - amount, 0)
  WHERE id = material_id;
END;
$$;

-- increment_stock_gudang: add stock to materials
CREATE OR REPLACE FUNCTION increment_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE materials
  SET stock_gudang = COALESCE(stock_gudang, 0) + amount
  WHERE id = material_id;
END;
$$;

-- consume_materials_for_production: atomic BOM consumption
CREATE OR REPLACE FUNCTION consume_materials_for_production(
  p_production_job_id UUID,
  p_order_id UUID,
  p_consumed_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_bom RECORD;
  v_qty NUMERIC;
  v_existing_id UUID;
  v_consumption_count INTEGER := 0;
  v_total_qty NUMERIC := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM production_jobs WHERE id = p_production_job_id) THEN
    RAISE EXCEPTION 'production_job_id % tidak ditemukan', p_production_job_id;
  END IF;

  SELECT id INTO v_existing_id
  FROM order_material_consumption
  WHERE production_job_id = p_production_job_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT COUNT(*), COALESCE(SUM(qty_consumed), 0)
      INTO v_consumption_count, v_total_qty
    FROM order_material_consumption
    WHERE production_job_id = p_production_job_id;

    RETURN jsonb_build_object(
      'already_consumed', true,
      'consumption_count', v_consumption_count,
      'total_qty', v_total_qty
    );
  END IF;

  FOR v_item IN
    SELECT product_id, qty
    FROM order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    FOR v_bom IN
      SELECT material_id, qty_per_unit
      FROM bom
      WHERE product_id = v_item.product_id
    LOOP
      v_qty := COALESCE(v_bom.qty_per_unit, 0) * COALESCE(v_item.qty, 0);

      IF v_qty <= 0 THEN
        CONTINUE;
      END IF;

      UPDATE materials
      SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - v_qty, 0)
      WHERE id = v_bom.material_id;

      INSERT INTO order_material_consumption
        (order_id, production_job_id, material_id, qty_consumed, consumed_by)
      VALUES
        (p_order_id, p_production_job_id, v_bom.material_id, v_qty, p_consumed_by);

      INSERT INTO inventory_movements
        (material_id, order_id, production_job_id, type, qty, reason, created_by)
      VALUES
        (v_bom.material_id, p_order_id, p_production_job_id, 'out', v_qty,
         'BOM consumption -- production job ' || p_production_job_id::text,
         p_consumed_by);

      v_consumption_count := v_consumption_count + 1;
      v_total_qty := v_total_qty + v_qty;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'already_consumed', false,
    'consumption_count', v_consumption_count,
    'total_qty', v_total_qty
  );
END;
$$;

-- advance_install_booking_status: cascade booking -> orders.status
CREATE OR REPLACE FUNCTION advance_install_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_staff_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_booking_type TEXT;
  v_old_status TEXT;
  v_order_classification TEXT;
BEGIN
  SELECT ib.order_id, ib.status, ib.type
    INTO v_order_id, v_old_status, v_booking_type
  FROM install_bookings ib
  WHERE ib.id = p_booking_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'install_bookings.id % tidak ditemukan', p_booking_id;
  END IF;

  IF p_new_status NOT IN ('pending','scheduled','in_progress','done','revision','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %. Valid: pending, scheduled, in_progress, done, revision, cancelled', p_new_status;
  END IF;

  UPDATE install_bookings
  SET status = p_new_status
  WHERE id = p_booking_id;

  IF v_booking_type = 'pasang' AND v_order_id IS NOT NULL THEN
    SELECT classification INTO v_order_classification
    FROM orders WHERE id = v_order_id;

    IF v_order_classification = 'pasang' THEN
      IF p_new_status = 'scheduled' THEN
        UPDATE orders SET status = 'scheduled' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id,
                  'Install booking scheduled -> orders.status auto-advance ke scheduled');
      ELSIF p_new_status = 'in_progress' THEN
        UPDATE orders SET status = 'installing' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id,
                  'Install sedang berjalan -> orders.status auto-advance ke installing');
      ELSIF p_new_status = 'done' THEN
        UPDATE orders SET status = 'done' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_done', p_staff_id,
                  'Install selesai -> orders.status auto-advance ke done');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'order_id', v_order_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'order_status_cascaded', (v_booking_type = 'pasang' AND v_order_id IS NOT NULL)
  );
END;
$$;

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
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
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembur_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steam_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_preparation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Core tables: authenticated staff full access
CREATE POLICY "Authenticated staff full access" ON public.users
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.customers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.materials
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.suppliers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.bom
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.order_items
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.production_jobs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.production_reports
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.inventory_movements
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.low_stock_alerts
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.purchase_requests
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.purchase_orders
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.install_checklists
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.lembur_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.qc_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.laundry_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.material_price_history
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.steam_jobs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff full access" ON public.order_progress_photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Categories: public read, auth write
CREATE POLICY "Public can read categories" ON public.categories
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write categories" ON public.categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Products: public read, auth write
CREATE POLICY "Public can read products" ON public.products
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write products" ON public.products
  FOR ALL USING (auth.role() = 'authenticated');

-- Banners: public read only active, auth write
CREATE POLICY "Public can read banners" ON public.banners
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Auth can write banners" ON public.banners
  FOR ALL USING (auth.role() = 'authenticated');

-- Portfolio: public read, auth write
CREATE POLICY "Public can read portfolio" ON public.portfolio_posts
  FOR SELECT USING (TRUE);
CREATE POLICY "Auth can write portfolio" ON public.portfolio_posts
  FOR ALL USING (auth.role() = 'authenticated');

-- Landing settings: public read, admin/owner write
CREATE POLICY "Anyone can read landing settings" ON public.landing_settings
  FOR SELECT USING (true);
CREATE POLICY "Only admin can update landing_settings" ON public.landing_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );
CREATE POLICY "Only admin can insert landing_settings" ON public.landing_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );
CREATE POLICY "Only admin can delete landing_settings" ON public.landing_settings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- Order logs: authenticated select + insert
CREATE POLICY "Authenticated users can view order logs" ON public.order_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated roles can insert order logs" ON public.order_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Returns: authenticated select/insert, admin/finance/owner update
CREATE POLICY "Authenticated users can view returns" ON public.returns
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and finance can insert returns" ON public.returns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins and finance can update returns" ON public.returns
  FOR UPDATE USING (auth.role() IN ('admin','finance','owner'));

-- Install bookings: public insert + select (for website booking form)
CREATE POLICY "Public can insert install_bookings" ON public.install_bookings
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read install_bookings" ON public.install_bookings
  FOR SELECT USING (true);

-- Order preparation checklists: authenticated full access
CREATE POLICY "Authenticated users can manage own checklist" ON public.order_preparation_checklists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Accounting tables: authenticated full access
CREATE POLICY "Authenticated users can manage accounts" ON public.accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage categories" ON public.account_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mappings" ON public.account_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage journals" ON public.journal_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage journal lines" ON public.journal_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage hutang" ON public.hutang
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage piutang" ON public.piutang
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage cash accounts" ON public.cash_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage assets" ON public.assets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock opname: admin/gudang/owner/finance only
CREATE POLICY "stock_opname_all" ON public.stock_opname_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','gudang','owner','finance')));
CREATE POLICY "stock_opname_items_all" ON public.stock_opname_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','gudang','owner','finance')));

-- style_rates: all authenticated can read, admin/owner write
CREATE POLICY "style_rates_select" ON public.style_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "style_rates_insert" ON public.style_rates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "style_rates_update" ON public.style_rates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "style_rates_delete" ON public.style_rates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));

-- laundry_orders: all authenticated read, admin/owner insert+delete, assigned staff update
CREATE POLICY "laundry_orders_select" ON public.laundry_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "laundry_orders_insert" ON public.laundry_orders
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "laundry_orders_update" ON public.laundry_orders
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner'))
    OR assigned_to = auth.uid());
CREATE POLICY "laundry_orders_delete" ON public.laundry_orders
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));

-- laundry_rates: all authenticated read, admin/owner write
CREATE POLICY "laundry_rates_select" ON public.laundry_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "laundry_rates_insert" ON public.laundry_rates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "laundry_rates_update" ON public.laundry_rates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));
CREATE POLICY "laundry_rates_delete" ON public.laundry_rates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner')));

-- laundry_payroll: admin/owner/finance only
CREATE POLICY "laundry_payroll_select" ON public.laundry_payroll
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner','finance')));
CREATE POLICY "laundry_payroll_insert" ON public.laundry_payroll
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner','finance')));
CREATE POLICY "laundry_payroll_update" ON public.laundry_payroll
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner','finance')));
CREATE POLICY "laundry_payroll_delete" ON public.laundry_payroll
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','owner','finance')));

-- order_material_consumption: all authenticated read, admin/gudang/owner write
CREATE POLICY "omc_select" ON public.order_material_consumption
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "omc_insert" ON public.order_material_consumption
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','gudang','owner')));
CREATE POLICY "omc_update" ON public.order_material_consumption
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','gudang','owner')));
CREATE POLICY "omc_delete" ON public.order_material_consumption
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin','gudang','owner')));

-- ============================================================
-- 8. SEED DATA
-- ============================================================

-- Default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Gorden', 'gorden'),
  ('Vitras', 'vitras'),
  ('Roman', 'roman'),
  ('Kupu-Kupu', 'kupu-kupu'),
  ('Kait & Aksesoris', 'kait-aksesoris'),
  ('Custom', 'custom')
ON CONFLICT (slug) DO NOTHING;

-- Landing settings default row
INSERT INTO public.landing_settings (id) VALUES ('hero')
ON CONFLICT (id) DO NOTHING;

-- Style rates
INSERT INTO public.style_rates (style, rate_per_meter) VALUES
  ('smokring', 5000),
  ('kaitan', 4000),
  ('kupu-kupu', 6000),
  ('romanshade', 7000)
ON CONFLICT (style) DO NOTHING;

-- Default laundry rate
INSERT INTO public.laundry_rates (name, rate_per_kg) VALUES ('Rate per kg', 5000);

-- Default account mappings (placeholder, will be updated below)
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('order_created', NULL, NULL, 'Journal when new order is created'),
  ('payment_received', NULL, NULL, 'Journal when customer payment is received'),
  ('expense_paid', NULL, NULL, 'Journal when expense is paid')
ON CONFLICT (transaction_type) DO NOTHING;

-- Account categories & chart of accounts (UUIDv4 compliant)
INSERT INTO public.account_categories (id, name, type, description) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Kas & Bank', 'asset', 'Kas, bank, e-wallet'),
  ('11111111-1111-4111-8111-111111111102', 'Piutang', 'asset', 'Piutang customer'),
  ('11111111-1111-4111-8111-111111111103', 'Persediaan', 'asset', 'Stok material & produk'),
  ('11111111-1111-4111-8111-111111111104', 'Aktiva Tetap', 'asset', 'Peralatan, kendaraan, dll'),
  ('11111111-1111-4111-8111-111111111105', 'Hutang', 'liability', 'Hutang supplier, kredit bank'),
  ('11111111-1111-4111-8111-111111111106', 'Modal', 'equity', 'Modal pemilik'),
  ('11111111-1111-4111-8111-111111111107', 'Penjualan', 'revenue', 'Pendapatan dari penjualan'),
  ('11111111-1111-4111-8111-111111111108', 'HPP', 'expense', 'Harga Pokok Penjualan'),
  ('11111111-1111-4111-8111-111111111109', 'Beban Operasional', 'expense', 'Beban gaji, sewa, utilitas'),
  ('11111111-1111-4111-8111-111111111110', 'Beban Lain-lain', 'expense', 'Beban lain di luar operasional')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.accounts (id, code, name, type, category_id, is_cash_account, description) VALUES
  -- Assets
  ('22222222-2222-4222-8222-222222222201', '1101', 'Kas', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Kas tunai'),
  ('22222222-2222-4222-8222-222222222202', '1102', 'Bank BCA', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Rekening bank BCA'),
  ('22222222-2222-4222-8222-222222222203', '1103', 'Bank Mandiri', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Rekening bank Mandiri'),
  ('22222222-2222-4222-8222-222222222204', '1104', 'Xendit Cash', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Saldo Xendit payment gateway'),
  ('22222222-2222-4222-8222-222222222205', '1201', 'Piutang Customer', 'asset', '11111111-1111-4111-8111-111111111102', false, 'Piutang dari customer'),
  ('22222222-2222-4222-8222-222222222206', '1301', 'Persediaan Bahan', 'asset', '11111111-1111-4111-8111-111111111103', false, 'Stok material/bahan di gudang'),
  ('22222222-2222-4222-8222-222222222207', '1302', 'Persediaan Barang Jadi', 'asset', '11111111-1111-4111-8111-111111111103', false, 'Stok produk jadi di toko'),
  ('22222222-2222-4222-8222-222222222208', '1401', 'Peralatan Toko', 'asset', '11111111-1111-4111-8111-111111111104', false, 'Peralatan operasional'),
  -- Liabilities
  ('33333333-3333-4333-8333-333333333301', '2101', 'Hutang Supplier', 'liability', '11111111-1111-4111-8111-111111111105', false, 'Hutang ke supplier'),
  -- Equity
  ('44444444-4444-4444-8444-444444444401', '3101', 'Modal Pemilik', 'equity', '11111111-1111-4111-8111-111111111106', false, 'Modal awal'),
  ('44444444-4444-4444-8444-444444444402', '3201', 'Laba Ditahan', 'equity', '11111111-1111-4111-8111-111111111106', false, 'Laba yang ditahan'),
  -- Revenue
  ('55555555-5555-4555-8555-555555555501', '4101', 'Penjualan Gorden', 'revenue', '11111111-1111-4111-8111-111111111107', false, 'Pendapatan dari penjualan gorden'),
  ('55555555-5555-4555-8555-555555555502', '4102', 'Penjualan Laundry', 'revenue', '11111111-1111-4111-8111-111111111107', false, 'Pendapatan dari laundry'),
  -- Expenses
  ('66666666-6666-4666-8666-666666666601', '5101', 'HPP Gorden', 'expense', '11111111-1111-4111-8111-111111111108', false, 'HPP material + upah penjahit'),
  ('66666666-6666-4666-8666-666666666602', '5102', 'HPP Laundry', 'expense', '11111111-1111-4111-8111-111111111108', false, 'HPP laundry'),
  ('66666666-6666-4666-8666-666666666603', '5201', 'Beban Gaji', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Beban gaji staff'),
  ('66666666-6666-4666-8666-666666666604', '5202', 'Beban Sewa', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Beban sewa tempat'),
  ('66666666-6666-4666-8666-666666666605', '5203', 'Beban Utilitas', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Listrik, air, internet'),
  ('66666666-6666-4666-8666-666666666606', '5301', 'Beban Selisih Kurs', 'expense', '11111111-1111-4111-8111-111111111110', false, 'Beban selisih kurs (USD/IDR)')
ON CONFLICT (id) DO NOTHING;

-- Account mappings with real account IDs
UPDATE public.account_mappings SET
  debit_account_id  = '22222222-2222-4222-8222-222222222205'::uuid,
  credit_account_id = '55555555-5555-4555-8555-555555555501'::uuid,
  description       = 'Order baru - Piutang (Debit) / Penjualan (Kredit)'
WHERE transaction_type = 'order_created';

UPDATE public.account_mappings SET
  debit_account_id  = '22222222-2222-4222-8222-222222222204'::uuid,
  credit_account_id = '22222222-2222-4222-8222-222222222205'::uuid,
  description       = 'Pembayaran diterima - Xendit (Debit) / Piutang (Kredit)'
WHERE transaction_type = 'payment_received';

UPDATE public.account_mappings SET
  debit_account_id  = '66666666-6666-4666-8666-666666666603'::uuid,
  credit_account_id = '22222222-2222-4222-8222-222222222201'::uuid,
  description       = 'Beban dibayar - Kas (Kredit) / Beban (Debit)'
WHERE transaction_type = 'expense_paid';

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('purchase', '22222222-2222-4222-8222-222222222206'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, 'PO received - Persediaan Bahan (Debit) / Hutang Supplier (Kredit)'),
  ('exchange_rate_diff', '66666666-6666-4666-8666-666666666606'::uuid, '66666666-6666-4666-8666-666666666606'::uuid, 'Selisih kurs - bisa debit atau credit (placeholder)')
ON CONFLICT (transaction_type) DO NOTHING;

-- Re-insert any mappings that might have been missed (idempotent)
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('order_created',
   '22222222-2222-4222-8222-222222222205'::uuid,
   '55555555-5555-4555-8555-555555555501'::uuid,
   'Order baru - Piutang (Debit) / Penjualan (Kredit)'),
  ('payment_received',
   '22222222-2222-4222-8222-222222222204'::uuid,
   '22222222-2222-4222-8222-222222222205'::uuid,
   'Pembayaran diterima - Xendit (Debit) / Piutang (Kredit)'),
  ('expense_paid',
   '66666666-6666-4666-8666-666666666603'::uuid,
   '22222222-2222-4222-8222-222222222201'::uuid,
   'Beban dibayar - Kas (Kredit) / Beban (Debit)')
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id  = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description       = EXCLUDED.description,
  is_active         = true;

-- ============================================================
-- 9. NOTIFY: Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SELESAI
-- ============================================================
-- Catatan:
-- - Migration 041 (reset_pipeline_to_sorted) di-skip — hanya data migration
-- - Migration 057 dynamic FK fix di-skip — ON DELETE SET NULL sudah di-handle di CREATE TABLE
-- - Migration 058 (SECURITY DEFINER audit) di-skip — dokumentasi saja
-- ============================================================

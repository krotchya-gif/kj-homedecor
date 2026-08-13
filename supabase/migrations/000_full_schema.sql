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
-- Catatan 079: kolom `email` TIDAK ada di live (drift schema file) — dihapus agar file = live.
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','surveyor','laundry')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  notes       TEXT,
  email       TEXT,
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
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  contact        TEXT,
  address        TEXT,
  contact_person TEXT,
  phone          TEXT,
  email          TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  -- kolom legacy/extra (kondisi live)
  variants        JSONB DEFAULT '[]',
  shipping_options JSONB DEFAULT '[]',
  is_visible      BOOLEAN DEFAULT TRUE,
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
  scheduled_installation_time TIME,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VIEW order_totals (live — agregasi DP/lunas per order; sync schema file = live)
CREATE OR REPLACE VIEW public.order_totals AS
  SELECT o.id,
    o.status,
    o.total_amount,
    COALESCE(sum(p.amount) FILTER (WHERE p.type = 'dp'::text), 0::numeric) AS total_dp,
    COALESCE(sum(p.amount) FILTER (WHERE p.type = 'lunas'::text), 0::numeric) AS total_lunas
  FROM orders o
  LEFT JOIN payments p ON p.order_id = o.id
  GROUP BY o.id;

-- ORDER LOGS (audit trail)
CREATE TABLE IF NOT EXISTS public.order_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN (
    'created','sorted','payment_approved','payment_verified','payment_input','payment_added','refund_issued',
    'production_started','production_completed','production_done',
    'qc_pass','qc_fail','ready','packed','shipped','installed','done',
    'return_initiated','return_stock_in','return_disposed','cancelled',
    'penjahit_assigned','install_started','install_done','install_revision',
    'steam_qc_pass','steam_revision_requeue','order_deleted','status_changed'
  )),
  description TEXT,
  notes       TEXT,
  staff_id    UUID REFERENCES public.users(id),
  created_by  UUID REFERENCES public.users(id),
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
  gorden_rate             NUMERIC DEFAULT 0,
  vitras_rate             NUMERIC DEFAULT 0,
  roman_rate              NUMERIC DEFAULT 0,
  kupu_kupu_rate          NUMERIC DEFAULT 0,
  meter_gorden            NUMERIC DEFAULT 0,
  meter_vitras            NUMERIC DEFAULT 0,
  meter_roman             NUMERIC DEFAULT 0,
  meter_kupu_kupu         NUMERIC DEFAULT 0,
  poni_lurus              NUMERIC DEFAULT 0,
  poni_gel                NUMERIC DEFAULT 0,
  notes                   TEXT,
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
  notes               TEXT,
  new_stock           NUMERIC,
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
  revision          INTEGER DEFAULT 0,
  completed_at      TIMESTAMPTZ,
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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id    UUID REFERENCES public.users(id),
  jam         NUMERIC,
  keterangan  TEXT
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
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
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
  key TEXT,
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
  robots_content TEXT,
  sitemap_content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. BUSINESS LOGIC TABLES
-- ============================================================

-- STEAM JOBS (Post-production QC) — kolom legacy laundry + modern order (kondisi live)
CREATE TABLE IF NOT EXISTS public.steam_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id        UUID,
  customer_name     TEXT,
  item              TEXT,
  qty               NUMERIC,
  order_id          UUID REFERENCES public.orders(id) ON DELETE CASCADE,
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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- kolom legacy (kondisi live — tidak dipakai codebase tapi ada di DB)
  date            DATE,
  account         TEXT,
  debit           NUMERIC DEFAULT 0,
  credit          NUMERIC DEFAULT 0,
  is_posted       BOOLEAN DEFAULT false,
  entry_type      TEXT,
  account_id      UUID REFERENCES public.accounts(id),
  cash_account_id UUID REFERENCES public.cash_accounts(id),
  idempotency_key TEXT
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
  description     TEXT,
  remaining       NUMERIC DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES public.users(id),
  return_reason   TEXT,
  return_date     DATE,
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
  fee_amount      NUMERIC DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
  order_id        UUID REFERENCES public.orders(id),
  notes           TEXT,
  description     TEXT,
  remaining       NUMERIC DEFAULT 0,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CASH ACCOUNTS
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID REFERENCES public.accounts(id),
  name            VARCHAR(255),
  code            VARCHAR(50),
  bank_name       VARCHAR(100),
  account_number  VARCHAR(50),
  account_holder  VARCHAR(255),
  balance         NUMERIC DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 077 fix: seed E Wallet Tiktok (1104) — saldo settlement marketplace TikTok di-track
-- oleh create_journal_atomic (cocokkan account_id dengan baris jurnal).
INSERT INTO public.cash_accounts (account_id, bank_name, account_number, is_active)
SELECT '22222222-2222-4222-8222-222222222204', 'E Wallet Tiktok', '', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts WHERE account_id = '22222222-2222-4222-8222-222222222204'
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
-- 078 fix (BUG-059): customers/materials/suppliers/orders tidak lagi permissive.
-- SELECT semua staff aktif; tulis admin/owner (orders: INSERT finance/admin/owner).
CREATE POLICY "All staff read customers" ON public.customers
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage customers" ON public.customers
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());
CREATE POLICY "All staff read materials" ON public.materials
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage materials" ON public.materials
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());
CREATE POLICY "All staff read suppliers" ON public.suppliers
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());
CREATE POLICY "All staff read orders" ON public.orders
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Finance admin owner insert orders" ON public.orders
  FOR INSERT WITH CHECK (public.is_finance_role());
CREATE POLICY "All staff update orders" ON public.orders
  FOR UPDATE USING (public.is_staff_active_sd()) WITH CHECK (public.is_staff_active_sd());
CREATE POLICY "Admin owner delete orders" ON public.orders
  FOR DELETE USING (public.is_admin_or_owner_sd());
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
CREATE POLICY "Authenticated staff access" ON public.install_checklists
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.lembur_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.qc_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.laundry_records
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.material_price_history
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.steam_jobs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.order_progress_photos
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

-- Landing settings: public read, write hanya admin/owner (083)
CREATE POLICY "Public can read landing_settings" ON public.landing_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin manage landing_settings" ON public.landing_settings
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- Order logs: authenticated full access (kondisi live)
CREATE POLICY "Authenticated staff access" ON public.order_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Returns: authenticated select/insert, finance update
CREATE POLICY "Authenticated users can view returns" ON public.returns
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert returns" ON public.returns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Install bookings: public insert + select (website booking) + staff access
CREATE POLICY "Public can insert install_bookings" ON public.install_bookings
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read install_bookings" ON public.install_bookings
  FOR SELECT USING (true);
-- 078 fix (BUG-059): ganti FOR ALL authenticated → SELECT staff, UPDATE installer, manage admin/owner
CREATE POLICY "All staff read install_bookings" ON public.install_bookings
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage install_bookings" ON public.install_bookings
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());
CREATE POLICY "Installer update install_bookings" ON public.install_bookings
  FOR UPDATE USING (public.is_installer_sd()) WITH CHECK (public.is_installer_sd());

-- Order preparation checklists: authenticated full access (kondisi live)
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
CREATE POLICY "stock_opname_sessions_select" ON public.stock_opname_sessions
  FOR SELECT TO authenticated
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

-- laundry_orders: authenticated full access (kondisi live)
CREATE POLICY "Authenticated staff access" ON public.laundry_orders
  FOR ALL USING (auth.role() = 'authenticated');

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

-- order_material_consumption: authenticated full access (kondisi live)
CREATE POLICY "Authenticated staff access" ON public.order_material_consumption
  FOR ALL USING (auth.role() = 'authenticated');

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
INSERT INTO public.landing_settings (id, key) VALUES ('hero', 'hero')
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
  ('22222222-2222-4222-8222-222222222204', '1104', 'E Wallet Tiktok', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Saldo E Wallet Tiktok (settlement marketplace)'),
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
  debit_account_id  = '22222222-2222-4222-8222-222222222201'::uuid,
  credit_account_id = '22222222-2222-4222-8222-222222222205'::uuid,
  description       = 'Pembayaran diterima - Kas (Debit) / Piutang (Kredit)'
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
   '22222222-2222-4222-8222-222222222201'::uuid,
   '22222222-2222-4222-8222-222222222205'::uuid,
   'Pembayaran diterima - Kas (Debit) / Piutang (Kredit)'),
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
-- 10. SINKRONISASI FINAL (migration 053-071 — kondisi live 2026-08-12)
--     Semua tambahan dari migration terbaru yang sudah di-push ke live.
--     Idempotent: IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ---------- 10.1 Kolom & index baru ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source_tag TEXT;

-- Kolom live yang dipakai codebase (audit schema <-> code 2026-08-12)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_courier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_awb TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost_estimated NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packing_note TEXT;
ALTER TABLE public.tiktok_shop_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ;
ALTER TABLE public.tiktok_shop_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.install_bookings ADD COLUMN IF NOT EXISTS actual_date TIMESTAMPTZ;
ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS normal_side TEXT;
ALTER TABLE public.hutang ADD COLUMN IF NOT EXISTS remaining NUMERIC DEFAULT 0;
ALTER TABLE public.landing_settings ADD COLUMN IF NOT EXISTS key TEXT;
UPDATE public.landing_settings SET key = 'hero' WHERE key IS NULL;

-- order_logs.action: tambah 'payment_verified' + union data live (production_completed, status_changed)
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS order_logs_action_check;
ALTER TABLE public.order_logs ADD CONSTRAINT order_logs_action_check CHECK (action IN (
  'created','sorted','payment_approved','payment_verified','payment_input','payment_added','refund_issued',
  'production_started','production_completed','production_done',
  'qc_pass','qc_fail','ready','packed','shipped','installed','done',
  'return_initiated','return_stock_in','return_disposed','cancelled',
  'penjahit_assigned','install_started','install_done','install_revision',
  'steam_qc_pass','steam_revision_requeue','order_deleted','status_changed'
));

ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_idempotency_unique
  ON public.journal_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS remaining NUMERIC DEFAULT 0;

ALTER TABLE public.laundry_orders
  ADD COLUMN IF NOT EXISTS kg_actual NUMERIC,
  ADD COLUMN IF NOT EXISTS reported_by UUID,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;

-- Trigger updated_at orders (056)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Constraint users_role_check FINAL (070): 8 role
-- (inline CHECK di CREATE TABLE users otomatis bernama users_role_check —
--  drop lalu recreate dengan daftar lengkap utk konsistensi)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','gudang','penjahit','finance','installer','owner','surveyor','laundry'));

-- Constraint accounts_type_check FINAL (067 + 074): VALID setelah cleanup type='income'
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('asset','liability','equity','revenue','expense'));
ALTER TABLE public.accounts VALIDATE CONSTRAINT accounts_type_check;

-- ---------- 10.2 Tabel baru: TikTok Shop (053) ----------
CREATE TABLE IF NOT EXISTS public.tiktok_shop_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name       VARCHAR(255),
  shop_region     VARCHAR(10) DEFAULT 'ID',
  app_key         TEXT NOT NULL,
  app_secret      TEXT NOT NULL,
  shop_cipher     VARCHAR(255),
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  seller_name     VARCHAR(255),
  open_id         VARCHAR(255),
  oauth_state     TEXT,
  is_active       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tiktok_shop_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tiktok_order_id VARCHAR(100) UNIQUE NOT NULL,
  order_status    VARCHAR(50),
  payment_status  VARCHAR(50),
  total_amount    NUMERIC(15,2) DEFAULT 0,
  shipping_amount NUMERIC(15,2) DEFAULT 0,
  platform_fee    NUMERIC(15,2) DEFAULT 0,
  commission_fee  NUMERIC(15,2) DEFAULT 0,
  net_amount      NUMERIC(15,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'IDR',
  buyer_name      VARCHAR(255),
  buyer_phone     VARCHAR(50),
  shipping_address TEXT,
  order_data      JSONB,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tiktok_shop_statements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id    VARCHAR(100) UNIQUE NOT NULL,
  statement_type  VARCHAR(50),
  total_amount    NUMERIC(15,2) DEFAULT 0,
  revenue_amount  NUMERIC(15,2) DEFAULT 0,
  fee_amount      NUMERIC(15,2) DEFAULT 0,
  shipping_cost_amount NUMERIC(15,2) DEFAULT 0,
  net_sales_amount     NUMERIC(15,2) DEFAULT 0,
  adjustment_amount    NUMERIC(15,2) DEFAULT 0,
  status          VARCHAR(50),
  currency        VARCHAR(10) DEFAULT 'IDR',
  start_date      DATE,
  end_date        DATE,
  paid_at         TIMESTAMPTZ,
  transaction_count INTEGER DEFAULT 0,
  statement_data  JSONB,
  is_synced       BOOLEAN DEFAULT false,
  piutang_id      UUID REFERENCES public.piutang(id) ON DELETE SET NULL,
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------- 10.3 Tabel baru: Survey (060) ----------
CREATE TABLE IF NOT EXISTS public.surveys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_number  TEXT UNIQUE,
  client_name    TEXT NOT NULL,
  client_address TEXT,
  survey_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  surveyor_id    UUID REFERENCES public.users(id),
  status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','tersimpan','diproses','selesai')),
  gps_lat        NUMERIC,
  gps_lng        NUMERIC,
  notes          TEXT,
  signature      TEXT,
  signature_name TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_rooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id     UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  room_name     TEXT NOT NULL,
  width_cm      NUMERIC,
  height_cm     NUMERIC,
  model_gorden  TEXT,
  fabric_name   TEXT,
  fabric_photo  TEXT,
  vitras_name   TEXT,
  vitras_photo  TEXT,
  rel_gorden    TEXT,
  rel_vitras    TEXT,
  hook          TEXT,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_room_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID NOT NULL REFERENCES public.survey_rooms(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id   UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  detail      TEXT,
  user_id     UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger survey updated_at
DROP TRIGGER IF EXISTS trg_surveys_updated_at ON public.surveys;
CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Relasi order -> survey (060)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.surveys(id);
CREATE INDEX IF NOT EXISTS idx_orders_survey_id ON public.orders(survey_id);

-- ---------- 10.4 Tabel baru: notifications (live — dipakai api/notifications) ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info',
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 10.5 Fungsi role helper (SECURITY DEFINER — BUKAN subquery di policy) ----------
CREATE OR REPLACE FUNCTION public.is_finance_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('finance','admin','owner')
  );
$$;
REVOKE ALL ON FUNCTION public.is_finance_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_finance_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_finance_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner')
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_owner_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_owner_sd() TO authenticated;

-- 078 (BUG-059): helper staff aktif & installer (dipakai policy orders/customers/
-- materials/suppliers/install_bookings)
CREATE OR REPLACE FUNCTION public.is_staff_active_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_staff_active_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_active_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff_active_sd() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_installer_sd()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role = 'installer'
  );
$$;
REVOKE ALL ON FUNCTION public.is_installer_sd() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_installer_sd() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_installer_sd() TO authenticated;

-- ---------- 10.6 Fungsi lain final ----------
CREATE OR REPLACE FUNCTION public.generate_survey_number()
RETURNS TEXT AS $$
  SELECT 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(survey_number FROM 'KJ-\d{8}-(\d+)$')::int)
       FROM public.surveys WHERE survey_number LIKE 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'),
      0) + 1 AS TEXT), 3, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION public.update_cash_account_balance(p_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finance_role() THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;
  UPDATE public.cash_accounts
  SET balance = COALESCE(balance, 0) + p_amount, updated_at = NOW()
  WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_cash_account_balance FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_cash_account_balance FROM anon;
GRANT EXECUTE ON FUNCTION public.update_cash_account_balance TO authenticated;

-- RPC jurnal atomik (064/066 — nama FINAL create_journal_atomic)
-- isi body mengikuti migration 066 (role check + idempotency + update saldo kas)
CREATE OR REPLACE FUNCTION public.create_journal_atomic(
  p_idempotency_key TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_entry_date DATE,
  p_is_auto BOOLEAN,
  p_lines JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line RECORD;
  v_duplicate UUID;
  v_result JSONB;
BEGIN
  IF NOT public.is_finance_role() AND auth.jwt() ->> 'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Minimal 1 baris jurnal';
  END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_duplicate FROM public.journal_entries WHERE idempotency_key = p_idempotency_key;
    IF v_duplicate IS NOT NULL THEN
      SELECT jsonb_build_object('id', id, 'idempotent', true, 'entry_date', entry_date, 'description', description)
        INTO v_result FROM public.journal_entries WHERE id = v_duplicate;
      RETURN v_result;
    END IF;
  END IF;
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC)
  LOOP
    IF v_line.account_id IS NULL THEN RAISE EXCEPTION 'account_id wajib di setiap baris'; END IF;
    IF (v_line.debit > 0) = (v_line.credit > 0) THEN
      RAISE EXCEPTION 'Setiap baris harus punya tepat satu sisi (debit ATAU credit)';
    END IF;
    v_total_debit := v_total_debit + COALESCE(v_line.debit, 0);
    v_total_credit := v_total_credit + COALESCE(v_line.credit, 0);
  END LOOP;
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal tidak balance - debit %, credit %', v_total_debit, v_total_credit;
  END IF;
  INSERT INTO public.journal_entries (entry_date, description, reference_type, reference_id,
    total_debit, total_credit, is_auto, created_by, idempotency_key)
  VALUES (p_entry_date, p_description, p_reference_type, p_reference_id,
    v_total_debit, v_total_credit, COALESCE(p_is_auto, false), p_created_by, p_idempotency_key)
  RETURNING id INTO v_entry_id;
  INSERT INTO public.journal_lines (entry_id, account_id, debit, credit, description)
  SELECT v_entry_id, (x.record).account_id, COALESCE((x.record).debit, 0),
    COALESCE((x.record).credit, 0), COALESCE((x.record).description, NULL)
  FROM (SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC, description TEXT)) x;
  UPDATE public.cash_accounts ca
  SET balance = COALESCE(ca.balance, 0) + t.delta, updated_at = NOW()
  FROM (
    SELECT account_id, SUM(debit - credit) AS delta
    FROM public.journal_lines WHERE entry_id = v_entry_id GROUP BY account_id
  ) t
  WHERE ca.account_id = t.account_id;
  SELECT jsonb_build_object('id', v_entry_id, 'idempotent', false,
    'entry_date', p_entry_date, 'description', p_description) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_journal_atomic FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_journal_atomic FROM anon;
GRANT EXECUTE ON FUNCTION public.create_journal_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_journal_atomic TO service_role;

-- RPC reset data (068 → 079 hardening: eksplisit 41 tabel + verifikasi post-reset
-- + guard seed + counts detail; TIDAK menghapus seed master)
CREATE OR REPLACE FUNCTION public.reset_transactional_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB;
  v_is_owner BOOLEAN;
  v_tbl TEXT;
  v_left BIGINT;
  v_seed_ok BOOLEAN;
  v_tables TEXT[] := ARRAY[
    'customers','orders','install_bookings','surveys','production_jobs',
    'production_reports','laundry_orders','laundry_payroll','laundry_records',
    'lembur_records','purchase_requests','purchase_orders','inventory_movements',
    'stock_opname_sessions','journal_entries','hutang','piutang','assets',
    'tiktok_shop_orders','tiktok_shop_statements','material_price_history',
    'low_stock_alerts','notifications',
    'order_items','order_logs','order_material_consumption',
    'order_preparation_checklists','order_progress_photos','packing_checklists',
    'payments','returns','return_requests','qc_records','steam_jobs',
    'install_checklists','journal_lines','stock_opname_items',
    'survey_rooms','survey_room_photos','survey_logs',
    'order_preparation_checklist'
  ];
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role = 'owner')
    INTO v_is_owner;
  IF NOT v_is_owner THEN RAISE EXCEPTION 'Forbidden: hanya Owner yang bisa reset data'; END IF;
  SELECT jsonb_build_object(
    'orders', (SELECT count(*) FROM public.orders),
    'customers', (SELECT count(*) FROM public.customers),
    'payments', (SELECT count(*) FROM public.payments),
    'journal_entries', (SELECT count(*) FROM public.journal_entries),
    'hutang', (SELECT count(*) FROM public.hutang),
    'piutang', (SELECT count(*) FROM public.piutang),
    'inventory_movements', (SELECT count(*) FROM public.inventory_movements),
    'purchase_orders', (SELECT count(*) FROM public.purchase_orders),
    'notifications', (SELECT count(*) FROM public.notifications),
    'lembur_records', (SELECT count(*) FROM public.lembur_records),
    'production_reports', (SELECT count(*) FROM public.production_reports),
    'tiktok_statements', (SELECT count(*) FROM public.tiktok_shop_statements)
  ) INTO v_counts;
  EXECUTE format('TRUNCATE TABLE %s CASCADE',
    (SELECT string_agg('public.' || quote_ident(t), ', ' ORDER BY t) FROM unnest(v_tables) t));
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_left;
    IF v_left > 0 THEN
      RAISE EXCEPTION 'Reset GAGAL: tabel % masih punya % baris (kemungkinan FK drift). Pembukuan dibiarkan utuh.',
        v_tbl, v_left;
    END IF;
  END LOOP;
  SELECT
    (SELECT count(*) FROM public.users) >= 1
    AND (SELECT count(*) FROM public.accounts) >= 1
    AND (SELECT count(*) FROM public.account_mappings) >= 1
  INTO v_seed_ok;
  IF NOT v_seed_ok THEN
    RAISE EXCEPTION 'Reset GAGAL: seed master (users/accounts/account_mappings) kosong setelah reset — cek migrasi seed.';
  END IF;
  UPDATE public.cash_accounts SET balance = 0, updated_at = NOW();
  UPDATE public.materials SET stock_gudang = 0, stock_toko = 0;
  UPDATE public.products SET stock_toko = 0;
  DROP TABLE IF EXISTS public.orders_pipeline_reset_backup_20260602;
  RETURN jsonb_build_object('success', true, 'message', 'Data transaksional berhasil di-reset. Seed master (staff, COA, produk, material, supplier, tarif, konten) dipertahankan.', 'counts_before', v_counts);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_transactional_data FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_transactional_data FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_transactional_data TO authenticated;

-- BUG-079 fix (081): search pesanan — filter search+status+kategori di SQL
-- (PostgREST .or() tidak mendukung kolom relasi customer.name → error diam-diam).
CREATE OR REPLACE FUNCTION public.search_orders(
  p_term TEXT DEFAULT '',
  p_status TEXT DEFAULT '',
  p_category UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total INT;
BEGIN
  IF NOT public.is_staff_active_sd() AND auth.jwt() ->> 'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH base AS (
    SELECT o.*
    FROM orders o
    WHERE
      (
        p_term IS NULL OR p_term = ''
        OR o.order_number ILIKE '%' || p_term || '%'
        OR COALESCE(o.tracking_number, '') ILIKE '%' || p_term || '%'
        OR EXISTS (
          SELECT 1 FROM customers c
          WHERE c.id = o.customer_id AND c.name ILIKE '%' || p_term || '%'
        )
      )
      AND (
        p_status IS NULL OR p_status = ''
        OR (p_status = 'ready_to_pack' AND o.status = 'ready' AND o.classification = 'kirim')
        OR (p_status = 'ready_to_ship' AND o.status = 'packed')
        OR o.status = p_status
      )
      AND (
        p_category IS NULL
        OR EXISTS (
          SELECT 1 FROM order_items oi
          JOIN products pr ON pr.id = oi.product_id
          WHERE oi.order_id = o.id AND pr.category_id = p_category
        )
      )
  )
  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(r)
      FROM (
        SELECT
          b.id,
          b.order_number,
          b.order_id_external,
          b.source,
          b.customer_id,
          b.classification,
          b.status,
          b.total_amount,
          b.dp_amount,
          b.lunas_amount,
          b.shipping_cost,
          b.payment_status,
          b.notes,
          b.admin_notes,
          b.tracking_number,
          b.courier,
          b.created_at,
          b.order_date,
          b.estimated_completion,
          b.scheduled_installation_date,
          (
            SELECT jsonb_build_object('name', c.name, 'phone', c.phone)
            FROM customers c WHERE c.id = b.customer_id
          ) AS customer,
          (
            SELECT COALESCE(jsonb_agg(oi2), '[]'::jsonb)
            FROM (
              SELECT
                oi.id,
                oi.product_id,
                oi.price,
                oi.qty,
                oi.custom_specs,
                (
                  SELECT jsonb_build_object(
                    'id', pr.id,
                    'name', pr.name,
                    'category', (
                      SELECT jsonb_build_object('name', cat.name)
                      FROM categories cat WHERE cat.id = pr.category_id
                    )
                  )
                  FROM products pr WHERE pr.id = oi.product_id
                ) AS product
              FROM order_items oi
              WHERE oi.order_id = b.id
            ) oi2
          ) AS order_items
        FROM base b
        ORDER BY b.created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) r
    ), '[]'::jsonb),
    'total', (SELECT count(*)::int FROM base)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) TO authenticated;

-- Versi FINAL RPC stock & pipeline dengan role check (067)
CREATE OR REPLACE FUNCTION public.increment_stock_toko(product_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;
  UPDATE public.products SET stock_toko = COALESCE(stock_toko, 0) + GREATEST(amount, 0) WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;
  UPDATE public.materials SET stock_gudang = COALESCE(stock_gudang, 0) + GREATEST(amount, 0) WHERE id = material_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;
  UPDATE public.materials SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - GREATEST(amount, 0), 0) WHERE id = material_id;
END;
$$;

-- Drop versi lama RPC stock ber-arg INTEGER (tanpa role check)
DROP FUNCTION IF EXISTS public.increment_stock_toko(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.increment_stock_gudang(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.decrement_stock_gudang(UUID, INTEGER);

REVOKE ALL ON FUNCTION public.increment_stock_toko(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_stock_toko(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_stock_toko(UUID, NUMERIC) TO authenticated;
REVOKE ALL ON FUNCTION public.increment_stock_gudang(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_stock_gudang(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_stock_gudang(UUID, NUMERIC) TO authenticated;
REVOKE ALL ON FUNCTION public.decrement_stock_gudang(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_stock_gudang(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock_gudang(UUID, NUMERIC) TO authenticated;

-- advance_install_booking_status FINAL (067: role check + search_path; body 061)
CREATE OR REPLACE FUNCTION public.advance_install_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_staff_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_booking_type TEXT;
  v_old_status TEXT;
  v_order_classification TEXT;
  v_is_admin BOOLEAN;
  v_is_owner_installer BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.users
    WHERE id = COALESCE(p_staff_id, auth.uid()) AND status = 'active' AND role IN ('admin','owner')) INTO v_is_admin;
  IF NOT v_is_admin THEN
    SELECT EXISTS (SELECT 1 FROM public.install_bookings ib
      WHERE ib.id = p_booking_id AND ib.installer_id = COALESCE(p_staff_id, auth.uid())) INTO v_is_owner_installer;
    IF NOT v_is_owner_installer THEN
      RAISE EXCEPTION 'Forbidden: bukan admin/owner atau installer booking ini';
    END IF;
  END IF;
  SELECT ib.order_id, ib.status, ib.type INTO v_order_id, v_old_status, v_booking_type
  FROM public.install_bookings ib WHERE ib.id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'install_bookings.id % tidak ditemukan', p_booking_id; END IF;
  IF p_new_status NOT IN ('pending','scheduled','in_progress','done','revision','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;
  UPDATE public.install_bookings SET status = p_new_status WHERE id = p_booking_id;
  IF v_booking_type = 'pasang' AND v_order_id IS NOT NULL THEN
    SELECT classification INTO v_order_classification FROM public.orders WHERE id = v_order_id;
    IF v_order_classification = 'pasang' THEN
      IF p_new_status = 'scheduled' THEN
        UPDATE public.orders SET status = 'scheduled' WHERE id = v_order_id;
        INSERT INTO public.order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id, 'Install booking scheduled');
      ELSIF p_new_status = 'in_progress' THEN
        UPDATE public.orders SET status = 'installing' WHERE id = v_order_id;
        INSERT INTO public.order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id, 'Install sedang berjalan');
      ELSIF p_new_status = 'done' THEN
        UPDATE public.orders SET status = 'done' WHERE id = v_order_id;
        INSERT INTO public.order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_done', p_staff_id, 'Install selesai');
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('booking_id', p_booking_id, 'order_id', v_order_id,
    'old_status', v_old_status, 'new_status', p_new_status,
    'order_status_cascaded', (v_booking_type = 'pasang' AND v_order_id IS NOT NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.advance_install_booking_status FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_install_booking_status FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_install_booking_status TO authenticated;

-- consume_materials_for_production FINAL (067: role check; body 051)
CREATE OR REPLACE FUNCTION public.consume_materials_for_production(
  p_production_job_id UUID,
  p_order_id UUID,
  p_consumed_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_bom RECORD;
  v_qty NUMERIC;
  v_existing_id UUID;
  v_consumption_count INTEGER := 0;
  v_total_qty NUMERIC := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users
    WHERE id = COALESCE(p_consumed_by, auth.uid()) AND status = 'active' AND role IN ('gudang','admin','owner')) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.production_jobs WHERE id = p_production_job_id) THEN
    RAISE EXCEPTION 'production_job_id % tidak ditemukan', p_production_job_id;
  END IF;
  SELECT id INTO v_existing_id FROM public.order_material_consumption
  WHERE production_job_id = p_production_job_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    SELECT COUNT(*), COALESCE(SUM(qty_consumed), 0) INTO v_consumption_count, v_total_qty
    FROM public.order_material_consumption WHERE production_job_id = p_production_job_id;
    RETURN jsonb_build_object('already_consumed', true, 'consumption_count', v_consumption_count, 'total_qty', v_total_qty);
  END IF;
  FOR v_item IN SELECT product_id, qty FROM public.order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    FOR v_bom IN SELECT material_id, qty_per_unit FROM public.bom WHERE product_id = v_item.product_id
    LOOP
      v_qty := COALESCE(v_bom.qty_per_unit, 0) * COALESCE(v_item.qty, 0);
      IF v_qty <= 0 THEN CONTINUE; END IF;
      UPDATE public.materials SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - v_qty, 0)
      WHERE id = v_bom.material_id;
      INSERT INTO public.order_material_consumption (order_id, production_job_id, material_id, qty_consumed, consumed_by)
      VALUES (p_order_id, p_production_job_id, v_bom.material_id, v_qty, p_consumed_by);
      INSERT INTO public.inventory_movements (material_id, order_id, production_job_id, type, qty, reason, created_by)
      VALUES (v_bom.material_id, p_order_id, p_production_job_id, 'out', v_qty,
        'BOM consumption - production job ' || p_production_job_id::text, p_consumed_by);
      v_consumption_count := v_consumption_count + 1;
      v_total_qty := v_total_qty + v_qty;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('already_consumed', false, 'consumption_count', v_consumption_count, 'total_qty', v_total_qty);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_materials_for_production FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_materials_for_production FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_materials_for_production TO authenticated;

-- ---------- 10.7 Policy FINAL (hardened — 063/067/071) ----------
-- users: SELECT semua staff; WRITE admin/owner via SECURITY DEFINER (BUKAN subquery!)
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.users;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.users;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.users;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
DROP POLICY IF EXISTS "All staff read users" ON public.users;
CREATE POLICY "All staff read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- payments / journal_entries / journal_lines: SELECT staff, WRITE finance
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.payments;
DROP POLICY IF EXISTS "All staff read payments" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payments" ON public.payments;
CREATE POLICY "All staff read payments" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage payments" ON public.payments
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage journals" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.journal_entries;
DROP POLICY IF EXISTS "All staff read journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Finance can manage journal_entries" ON public.journal_entries;
CREATE POLICY "All staff read journal_entries" ON public.journal_entries
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_entries" ON public.journal_entries
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage journal lines" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_lines;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.journal_lines;
DROP POLICY IF EXISTS "All staff read journal_lines" ON public.journal_lines;
DROP POLICY IF EXISTS "Finance can manage journal_lines" ON public.journal_lines;
CREATE POLICY "All staff read journal_lines" ON public.journal_lines
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_lines" ON public.journal_lines
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- laundry/payroll/rates/style/assets/account_categories (055 buka lagi -> 067 tutup)
DROP POLICY IF EXISTS "laundry_payroll_select" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_insert" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_update" ON public.laundry_payroll;
DROP POLICY IF EXISTS "laundry_payroll_delete" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Authenticated users can manage laundry payroll" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.laundry_payroll;
DROP POLICY IF EXISTS "All staff read laundry_payroll" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Finance can manage laundry_payroll" ON public.laundry_payroll;
CREATE POLICY "All staff read laundry_payroll" ON public.laundry_payroll
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_payroll" ON public.laundry_payroll
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "laundry_rates_select" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_insert" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_update" ON public.laundry_rates;
DROP POLICY IF EXISTS "laundry_rates_delete" ON public.laundry_rates;
DROP POLICY IF EXISTS "Authenticated users can manage laundry rates" ON public.laundry_rates;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.laundry_rates;
DROP POLICY IF EXISTS "All staff read laundry_rates" ON public.laundry_rates;
DROP POLICY IF EXISTS "Finance can manage laundry_rates" ON public.laundry_rates;
CREATE POLICY "All staff read laundry_rates" ON public.laundry_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_rates" ON public.laundry_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "style_rates_select" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_insert" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_update" ON public.style_rates;
DROP POLICY IF EXISTS "style_rates_delete" ON public.style_rates;
DROP POLICY IF EXISTS "Authenticated users can manage style rates" ON public.style_rates;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.style_rates;
DROP POLICY IF EXISTS "All staff read style_rates" ON public.style_rates;
DROP POLICY IF EXISTS "Finance can manage style_rates" ON public.style_rates;
CREATE POLICY "All staff read style_rates" ON public.style_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage style_rates" ON public.style_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.assets;
DROP POLICY IF EXISTS "All staff read assets" ON public.assets;
DROP POLICY IF EXISTS "Finance can manage assets" ON public.assets;
CREATE POLICY "All staff read assets" ON public.assets
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage assets" ON public.assets
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated users can manage account categories" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff full access" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.account_categories;
DROP POLICY IF EXISTS "All staff read account_categories" ON public.account_categories;
DROP POLICY IF EXISTS "Finance can manage account_categories" ON public.account_categories;
CREATE POLICY "All staff read account_categories" ON public.account_categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_categories" ON public.account_categories
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- accounts / account_mappings / hutang / piutang / cash_accounts: FINAL (pola 067)
DROP POLICY IF EXISTS "Authenticated users can manage accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.accounts;
DROP POLICY IF EXISTS "All staff read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Finance can manage accounts" ON public.accounts;
CREATE POLICY "All staff read accounts" ON public.accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage accounts" ON public.accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.account_mappings;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.account_mappings;
DROP POLICY IF EXISTS "All staff read account_mappings" ON public.account_mappings;
DROP POLICY IF EXISTS "Finance can manage account_mappings" ON public.account_mappings;
CREATE POLICY "All staff read account_mappings" ON public.account_mappings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_mappings" ON public.account_mappings
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage hutang" ON public.hutang;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.hutang;
DROP POLICY IF EXISTS "All staff read hutang" ON public.hutang;
DROP POLICY IF EXISTS "Finance can manage hutang" ON public.hutang;
CREATE POLICY "All staff read hutang" ON public.hutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage hutang" ON public.hutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage piutang" ON public.piutang;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.piutang;
DROP POLICY IF EXISTS "All staff read piutang" ON public.piutang;
DROP POLICY IF EXISTS "Finance can manage piutang" ON public.piutang;
CREATE POLICY "All staff read piutang" ON public.piutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage piutang" ON public.piutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

DROP POLICY IF EXISTS "Authenticated users can manage cash accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.cash_accounts;
DROP POLICY IF EXISTS "All staff read cash_accounts" ON public.cash_accounts;
DROP POLICY IF EXISTS "Finance can manage cash_accounts" ON public.cash_accounts;
CREATE POLICY "All staff read cash_accounts" ON public.cash_accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage cash_accounts" ON public.cash_accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- TikTok (067): revoke anon + role-based + ENABLE RLS (policy lama dibuat tanpa ENABLE)
DROP POLICY IF EXISTS "owner_all_tiktok_settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "owner_all_tiktok_orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "owner_all_tiktok_statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok owner manage settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok owner manage orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok owner manage statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok manage settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok manage orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok manage statements" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.tiktok_shop_statements;
DROP POLICY IF EXISTS "TikTok staff read settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "TikTok staff read orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "TikTok staff read statements" ON public.tiktok_shop_statements;
REVOKE ALL ON public.tiktok_shop_settings FROM anon;
REVOKE ALL ON public.tiktok_shop_orders FROM anon;
REVOKE ALL ON public.tiktok_shop_statements FROM anon;
-- 078 (BUG-059): cabut grant anon dari materials/suppliers (bocor — tidak dipakai publik)
REVOKE ALL ON public.materials FROM anon;
REVOKE ALL ON public.suppliers FROM anon;
ALTER TABLE public.tiktok_shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_shop_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TikTok staff read settings" ON public.tiktok_shop_settings
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage settings" ON public.tiktok_shop_settings
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());
CREATE POLICY "TikTok staff read orders" ON public.tiktok_shop_orders
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage orders" ON public.tiktok_shop_orders
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());
CREATE POLICY "TikTok staff read statements" ON public.tiktok_shop_statements
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance')));
CREATE POLICY "TikTok manage statements" ON public.tiktok_shop_statements
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- Survey (060): surveyor milik sendiri; admin/owner semua
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_room_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS surveys_admin_owner ON public.surveys;
CREATE POLICY surveys_admin_owner ON public.surveys FOR ALL USING (public.is_admin_or_owner_sd());
DROP POLICY IF EXISTS surveys_surveyor_own ON public.surveys;
CREATE POLICY surveys_surveyor_own ON public.surveys
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor' AND surveyor_id = auth.uid());
DROP POLICY IF EXISTS survey_rooms_admin_owner ON public.survey_rooms;
CREATE POLICY survey_rooms_admin_owner ON public.survey_rooms FOR ALL USING (public.is_admin_or_owner_sd());
DROP POLICY IF EXISTS survey_rooms_surveyor_own ON public.survey_rooms;
CREATE POLICY survey_rooms_surveyor_own ON public.survey_rooms
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor'
    AND EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()));
DROP POLICY IF EXISTS survey_photos_admin_owner ON public.survey_room_photos;
CREATE POLICY survey_photos_admin_owner ON public.survey_room_photos FOR ALL USING (public.is_admin_or_owner_sd());
DROP POLICY IF EXISTS survey_photos_surveyor_own ON public.survey_room_photos;
CREATE POLICY survey_photos_surveyor_own ON public.survey_room_photos
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'surveyor'
    AND EXISTS (SELECT 1 FROM public.survey_rooms r JOIN public.surveys s ON s.id = r.survey_id
      WHERE r.id = room_id AND s.surveyor_id = auth.uid()));

-- survey_logs: RLS + policy (072 — kondisi live; helper standar, bukan is_admin_or_owner legacy)
ALTER TABLE public.survey_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "survey_logs_admin_all" ON public.survey_logs;
CREATE POLICY "survey_logs_admin_all" ON public.survey_logs
  FOR ALL USING (public.is_admin_or_owner_sd());
DROP POLICY IF EXISTS "survey_logs_surveyor_insert" ON public.survey_logs;
CREATE POLICY "survey_logs_surveyor_insert" ON public.survey_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid())
  );
DROP POLICY IF EXISTS "survey_logs_surveyor_read" ON public.survey_logs;
CREATE POLICY "survey_logs_surveyor_read" ON public.survey_logs
  FOR SELECT USING (
    (EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.surveyor_id = auth.uid()))
    OR public.is_admin_or_owner_sd()
  );

-- returns: finance update (063)
DROP POLICY IF EXISTS "Admins and finance can update returns" ON public.returns;
CREATE POLICY "Finance can update returns" ON public.returns
  FOR UPDATE USING (public.is_finance_role());

-- ---------- 10.8 Akun & mapping baru (067: sales_return; 063: hutang/piutang/ecommerce) ----------
INSERT INTO public.accounts (id, code, name, type, category_id, is_cash_account, description)
VALUES (
  '55555555-5555-4555-8555-555555555503', '4103', 'Penjualan Retur', 'revenue',
  '11111111-1111-4111-8111-111111111107', false, 'Pengurang omzet saat barang diretur / refund ke customer'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, description = EXCLUDED.description;

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active)
VALUES (
  'sales_return',
  '55555555-5555-4555-8555-555555555503',
  '22222222-2222-4222-8222-222222222201',
  'Refund/retur - Penjualan Retur (Debit) / Kas (Kredit)', true
)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description, is_active = true;

UPDATE public.account_mappings SET is_active = false WHERE transaction_type = 'refund_issued';

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active)
VALUES
  ('hutang_paid', '33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', 'Bayar hutang - Hutang Supplier (Debit) / Kas (Kredit)', true),
  ('piutang_received', '22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222205', 'Terima piutang - Kas (Debit) / Piutang (Kredit)', true),
  ('ecommerce_fee', '66666666-6666-4666-8666-666666666606', '22222222-2222-4222-8222-222222222205', 'Komisi/biaya marketplace - Beban (Debit) / Piutang (Kredit)', true)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description, is_active = true;

UPDATE public.accounts
SET name = 'Beban Biaya Lain E-commerce', description = 'Komisi, iklan, fee marketplace (selisih gross vs net settlement)'
WHERE id = '66666666-6666-4666-8666-666666666606'::uuid;

-- ---------- 10.9 Tabel legacy live (tidak dipakai codebase — untuk paritas schema) ----------
-- 079: seo_settings DROP (dead sejak migration 008; SEO aktif via landing_settings.seo_*)
CREATE TABLE IF NOT EXISTS public.packing_checklists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL,
  items        JSONB NOT NULL DEFAULT '[]',
  photo_packed JSONB DEFAULT '[]',
  checked_by   UUID REFERENCES public.users(id),
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC DEFAULT 0,
  notes         TEXT,
  photo_evidence JSONB DEFAULT '[]',
  created_by    UUID REFERENCES public.users(id),
  processed_by  UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.order_preparation_checklist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL,
  item_name   TEXT,
  qty         INTEGER NOT NULL DEFAULT 1,
  checked     BOOLEAN NOT NULL DEFAULT false,
  checked_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.packing_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_preparation_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff access" ON public.packing_checklists
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.return_requests
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated staff access" ON public.order_preparation_checklist
  FOR ALL USING (auth.role() = 'authenticated');

-- ---------- 10.10 TikTok settlement fee breakdown + piutang fee (073) ----------
ALTER TABLE public.tiktok_shop_statements
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_sales_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(15,2) DEFAULT 0;

ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0;

UPDATE public.tiktok_shop_statements
SET revenue_amount       = COALESCE(NULLIF((statement_data ->> 'revenue_amount')::numeric, 0), NULLIF((statement_data ->> 'revenueAmount')::numeric, 0), total_amount),
    fee_amount           = COALESCE(NULLIF((statement_data ->> 'fee_amount')::numeric, 0), NULLIF((statement_data ->> 'feeAmount')::numeric, 0), 0),
    shipping_cost_amount = COALESCE(NULLIF((statement_data ->> 'shipping_cost_amount')::numeric, 0), NULLIF((statement_data ->> 'shippingCostAmount')::numeric, 0), 0),
    net_sales_amount     = COALESCE(NULLIF((statement_data ->> 'net_sales_amount')::numeric, 0), NULLIF((statement_data ->> 'netSalesAmount')::numeric, 0), 0),
    adjustment_amount    = COALESCE(NULLIF((statement_data ->> 'adjustment_amount')::numeric, 0), NULLIF((statement_data ->> 'adjustmentAmount')::numeric, 0), 0)
WHERE statement_data IS NOT NULL AND statement_data::text <> '{}';

CREATE UNIQUE INDEX IF NOT EXISTS piutang_tiktok_invoice_unique
  ON public.piutang (invoice_number)
  WHERE channel = 'tiktok' AND invoice_number IS NOT NULL;

-- Unique invoice semua channel (076) — anti-double faktur
CREATE UNIQUE INDEX IF NOT EXISTS piutang_invoice_unique
  ON public.piutang (invoice_number)
  WHERE invoice_number IS NOT NULL;

-- ---------- 10.11 Stock opname approve (075) ----------
CREATE OR REPLACE FUNCTION public.approve_stock_opname(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('finance','admin','owner')
  ) THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;
  SELECT status INTO v_status FROM public.stock_opname_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi stock opname tidak ditemukan';
  END IF;
  IF v_status = 'approved' THEN
    RETURN jsonb_build_object('idempotent', true, 'message', 'Sesi sudah disetujui');
  END IF;
  IF v_status <> 'submitted' THEN
    RAISE EXCEPTION 'Status sesi harus "submitted" (sekarang: %)', v_status;
  END IF;
  UPDATE public.materials m
  SET stock_gudang = GREATEST(COALESCE(m.stock_gudang, 0) + i.difference, 0)
  FROM public.stock_opname_items i
  WHERE i.session_id = p_session_id AND i.material_id = m.id;
  INSERT INTO public.inventory_movements (material_id, type, qty, from_location, reason, created_by)
  SELECT material_id, 'adjustment', difference, 'gudang',
    'Stock opname sesi ' || p_session_id::text, auth.uid()
  FROM public.stock_opname_items
  WHERE session_id = p_session_id;
  UPDATE public.stock_opname_sessions
  SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_session_id;
  RETURN jsonb_build_object('idempotent', false, 'message', 'Sesi disetujui & selisih diterapkan ke stok');
END;
$$;
REVOKE ALL ON FUNCTION public.approve_stock_opname FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_stock_opname FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_opname TO authenticated;

-- ============================================================
-- 11. NOTIFY: Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SELESAI
-- ============================================================
-- Catatan:
-- - File ini = SATU-SATUNYA referensi schema (lihat AGENTS.md).
-- - Section 10 = sinkronisasi final migration 053-072 (kondisi live 2026-08-12,
--   diverifikasi via pg_policies + information_schema live).
-- - Migration 041 (reset_pipeline_to_sorted) di-skip — hanya data migration
-- - Migration 057 dynamic FK fix di-skip — ON DELETE SET NULL sudah di-handle di CREATE TABLE
-- - Migration 058 (SECURITY DEFINER audit) di-skip — dokumentasi saja
-- ============================================================

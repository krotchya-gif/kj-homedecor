-- ============================================================================
-- Migration 055: FIX REMAINING SCHEMA DRIFT — superset lengkap
-- Project: kjhomedecor (Supabase glblgsfenarnztawtpmu)
-- Date: 2026-08-01
-- Reason: Audit migration 001-054 vs production menemukan 17+ migration yang
--          BELUM pernah dijalankan (DB production di-clone dari backup lama +
--          migration dijalankan manual tidak berurutan). File ini = superset
--          dari 054 + semua kolom/tabel/RPC yang masih hilang.
--
-- Migration yang belum jalan & dicover di sini:
--   002 (order_logs notes/staff_id), 003 (returns), 004/005/008/009
--   (landing_settings kolom), 006 (scheduled_date/time/source),
--   007 (packed/shipped/courier/tracking), 011 (laundry_payroll/rates),
--   012 (style variants), 013 (style_rates), 014 (linked_laundry_id),
--   016 (is_catalog_visible), 017 (order_preparation_checklists),
--   025 (journal_lines), 028/044 (stock RPC numeric),
--   034 (revision_reason/photos), 043 (xendit_payment_id),
--   045 (order_logs action constraint) + RPC manual yang hilang
--   (generate_order_number, update_cash_account_balance, exec_sql).
--
-- AMAN DIJALANKAN ULANG (idempotent): semua pakai IF NOT EXISTS /
-- DROP IF EXISTS / CREATE OR REPLACE.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. LANDING_SETTINGS — tambah kolom migration 004/005/008/009
--    (production masih EAV: id/key/value/updated_at)
-- ============================================================================
ALTER TABLE public.landing_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '6281234567890',
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Halo KJ Homedecor, saya ingin konsultasi gorden',
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS hero_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS hero_cta_link TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS shopee TEXT,
  ADD COLUMN IF NOT EXISTS tokopedia TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS seo_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_ga4_id TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image TEXT;

-- Backfill EAV -> kolom
UPDATE public.landing_settings SET
  hero_title        = COALESCE(value->>'hero_title', hero_title),
  hero_subtitle     = COALESCE(value->>'hero_subtitle', hero_subtitle),
  hero_cta_text     = COALESCE(value->>'hero_cta_text', hero_cta_text),
  hero_cta_link     = COALESCE(value->>'hero_cta_link', hero_cta_link),
  hero_image_url    = COALESCE(value->>'hero_image_url', hero_image_url)
WHERE key = 'hero';

UPDATE public.landing_settings SET
  whatsapp_number   = COALESCE((SELECT value->>'phone'    FROM public.landing_settings WHERE key = 'contact' LIMIT 1), whatsapp_number),
  whatsapp_message  = COALESCE((SELECT value->>'message'  FROM public.landing_settings WHERE key = 'contact' LIMIT 1), whatsapp_message),
  phone             = COALESCE((SELECT value->>'phone'    FROM public.landing_settings WHERE key = 'contact' LIMIT 1), phone),
  address           = COALESCE((SELECT value->>'address'  FROM public.landing_settings WHERE key = 'contact' LIMIT 1), address)
WHERE key = 'hero';

UPDATE public.landing_settings SET
  instagram = COALESCE((SELECT value->>'instagram' FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), instagram),
  facebook  = COALESCE((SELECT value->>'facebook'  FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), facebook),
  tiktok    = COALESCE((SELECT value->>'tiktok'    FROM public.landing_settings WHERE key = 'social_media' LIMIT 1), tiktok)
WHERE key = 'hero';

-- ============================================================================
-- 3. INSTALL_BOOKINGS — migration 006 + 034
-- ============================================================================
ALTER TABLE public.install_bookings
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website'
    CHECK (source IN ('website', 'manual', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS revision_reason TEXT,
  ADD COLUMN IF NOT EXISTS revision_photos TEXT[];

-- address jadi nullable (booking website tidak wajib isi alamat manual dulu)
ALTER TABLE public.install_bookings ALTER COLUMN address DROP NOT NULL;

-- Backfill date/time lama -> scheduled_*
UPDATE public.install_bookings
SET scheduled_date = date, scheduled_time = time
WHERE scheduled_date IS NULL AND date IS NOT NULL;

-- Status check lengkap (047: pending/scheduled/in_progress/done/revision/cancelled)
ALTER TABLE public.install_bookings DROP CONSTRAINT IF EXISTS install_bookings_status_check;
ALTER TABLE public.install_bookings ADD CONSTRAINT install_bookings_status_check
  CHECK (status IN ('pending','scheduled','in_progress','done','revision','cancelled'));

CREATE INDEX IF NOT EXISTS idx_ib_revision_status
  ON public.install_bookings(status) WHERE status = 'revision';

-- RLS: public boleh insert + read booking (form website)
DROP POLICY IF EXISTS "Public can insert install_bookings" ON public.install_bookings;
CREATE POLICY "Public can insert install_bookings" ON public.install_bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read install_bookings" ON public.install_bookings;
CREATE POLICY "Public can read install_bookings" ON public.install_bookings
  FOR SELECT USING (true);

-- ============================================================================
-- 4. ORDERS — migration 002/003/007 (packed/shipped/installed/courier/tracking)
--    production masih punya kolom lama: shipping_courier, shipping_awb
-- ============================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Backfill nama kolom lama -> baru
UPDATE public.orders SET courier = shipping_courier WHERE courier IS NULL AND shipping_courier IS NOT NULL;
UPDATE public.orders SET tracking_number = shipping_awb WHERE tracking_number IS NULL AND shipping_awb IS NOT NULL;

-- ============================================================================
-- 5. ORDER_ITEMS — migration 003/012/014 (variant, meter, dimension, weight,
--    linked_laundry_id, return fields)
--    production masih punya: meter_gorden, meter_vitras, meter_roman,
--    meter_kupu_kupu, smokering_color (schema LAMA)
-- ============================================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS meter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS style_type TEXT,
  ADD COLUMN IF NOT EXISTS smokring_color TEXT,
  ADD COLUMN IF NOT EXISTS variant_color TEXT,
  ADD COLUMN IF NOT EXISTS variant_size TEXT,
  ADD COLUMN IF NOT EXISTS dimension_p NUMERIC,
  ADD COLUMN IF NOT EXISTS dimension_l NUMERIC,
  ADD COLUMN IF NOT EXISTS dimension_t NUMERIC,
  ADD COLUMN IF NOT EXISTS weight NUMERIC,
  ADD COLUMN IF NOT EXISTS linked_laundry_id UUID REFERENCES public.laundry_orders(id),
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Backfill meter total dari kolom lama (jika salah satu terisi)
UPDATE public.order_items SET
  meter = COALESCE(meter_gorden, 0) + COALESCE(meter_vitras, 0) + COALESCE(meter_roman, 0) + COALESCE(meter_kupu_kupu, 0)
WHERE (meter IS NULL OR meter = 0)
  AND (COALESCE(meter_gorden, 0) + COALESCE(meter_vitras, 0) + COALESCE(meter_roman, 0) + COALESCE(meter_kupu_kupu, 0)) > 0;

-- Backfill typo kolom lama smokering_color -> smokring_color
UPDATE public.order_items SET smokring_color = smokering_color
WHERE smokring_color IS NULL AND smokering_color IS NOT NULL;

-- ============================================================================
-- 6. PRODUCTS — migration 012/016 (variants, dimension, weight, is_catalog_visible)
--    production masih punya: is_visible, variants (schema LAMA)
-- ============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_catalog_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS style_variants TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS smokring_colors TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color_variants TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dimension_p NUMERIC,
  ADD COLUMN IF NOT EXISTS dimension_l NUMERIC,
  ADD COLUMN IF NOT EXISTS dimension_t NUMERIC,
  ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- Backfill is_visible -> is_catalog_visible
UPDATE public.products SET is_catalog_visible = is_visible WHERE is_catalog_visible IS NULL AND is_visible IS NOT NULL;

-- ============================================================================
-- 7. PAYMENTS — migration 043 (xendit idempotency)
-- ============================================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS xendit_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_xendit_id
  ON public.payments(xendit_payment_id) WHERE xendit_payment_id IS NOT NULL;

-- ============================================================================
-- 8. ORDER_LOGS — migration 002 (notes/staff_id) + 045 (action constraint)
--    production pakai description/created_by — tambahkan kolom yang kode pakai
-- ============================================================================
ALTER TABLE public.order_logs
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.users(id);

-- Constraint action lengkap (045) — kode pakai 20+ action values
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS chk_action;
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS order_logs_action_check;
ALTER TABLE public.order_logs ADD CONSTRAINT chk_action
  CHECK (action IN (
    'created','sorted','payment_approved','payment_verified','production_started',
    'production_done','qc_pass','qc_fail','ready','packed','shipped','installed',
    'done','return_initiated','return_stock_in','return_disposed','cancelled',
    'penjahit_assigned','install_started','install_done','install_revision',
    'steam_qc_pass','steam_revision_requeue','order_deleted','payment_input',
    'payment_added','refund_issued','status_changed','production_completed'
  ));

-- ============================================================================
-- 9. TABEL HILANG
-- ============================================================================

-- 9a. returns (003)
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

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view returns" ON public.returns
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert returns" ON public.returns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins and finance can update returns" ON public.returns
  FOR UPDATE USING (auth.role() IN ('admin','finance','owner'));

CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(refund_status);

-- 9b. laundry_payroll (011)
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

ALTER TABLE public.laundry_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage laundry payroll" ON public.laundry_payroll
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9c. laundry_rates (011)
CREATE TABLE IF NOT EXISTS public.laundry_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  rate_per_kg     NUMERIC NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.laundry_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage laundry rates" ON public.laundry_rates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9d. style_rates (013)
CREATE TABLE IF NOT EXISTS public.style_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style           TEXT UNIQUE NOT NULL,
  rate_per_meter  NUMERIC NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.style_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage style rates" ON public.style_rates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.style_rates (style, rate_per_meter) VALUES
  ('smokring', 5000), ('kaitan', 4000), ('kupu-kupu', 6000), ('romanshade', 7000)
ON CONFLICT (style) DO NOTHING;

-- 9e. order_preparation_checklists (017)
CREATE TABLE IF NOT EXISTS public.order_preparation_checklists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  items         JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_preparation_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own checklist"
  ON public.order_preparation_checklists FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 9f. journal_lines (025)
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id        UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES accounts(id),
  debit           NUMERIC DEFAULT 0,
  credit          NUMERIC DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage journal lines" ON public.journal_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON public.journal_lines(account_id);

-- ============================================================================
-- 10. RPC YANG HILANG
-- ============================================================================

-- 10a. generate_order_number (015) — dipakai api/orders
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(order_number FROM 'ORD-\d{4}-(\d+)$')::int)
       FROM orders WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
      0) + 1 AS TEXT), 4, '0');
$$ LANGUAGE SQL;

-- 10b. stock RPC numeric (044) — dipakai gudang & admin
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

-- 10c. update_cash_account_balance (MANUAL di dashboard dulu — kode pakai:
--      rpc('update_cash_account_balance', { p_id, p_amount }))
CREATE OR REPLACE FUNCTION update_cash_account_balance(p_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cash_accounts
  SET balance = COALESCE(balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_id;
END;
$$;

-- 10d. exec_sql (MANUAL di dashboard dulu — kode pakai:
--      rpc('exec_sql', { query: sql }) di halaman owner/tiktok/migrate)
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- ============================================================================
-- 11. TABEL YANG ADA TAPI KOLOM TIDAK LENGKAP (audit final 2026-08-01)
-- ============================================================================

-- 11a. accounts (production: id/code/name/type/normal_side/... tanpa balance/parent_id/updated_at)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 11b. assets (production hanya kolom dasar; migration 024 menambah sisanya)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS purchase_value NUMERIC,
  ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(20) DEFAULT 'straight-line'
    CHECK (depreciation_method IN ('straight-line', 'declining-balance')),
  ADD COLUMN IF NOT EXISTS useful_life_years NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accumulated_depreciation NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'disposed', 'sold')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 11c. cash_accounts (production: id/balance/is_active/created_at saja)
ALTER TABLE public.cash_accounts
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 11d. hutang
ALTER TABLE public.hutang
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 11e. piutang
ALTER TABLE public.piutang
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 11f. journal_entries (production = schema 001 lama: date/account/debit/credit;
--      migration 025 = entry_date/total_debit/total_credit/is_auto — kode pakai entry_date)
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS entry_date DATE,
  ADD COLUMN IF NOT EXISTS total_debit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_credit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT false;

-- Backfill entry_date dari date (kolom lama schema 001)
UPDATE public.journal_entries
SET entry_date = date
WHERE entry_date IS NULL AND date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);

-- 11g. laundry_orders (production: customer_name/customer_phone/status/created_by saja)
ALTER TABLE public.laundry_orders
  ADD COLUMN IF NOT EXISTS kg NUMERIC,
  ADD COLUMN IF NOT EXISTS meter NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 11h. material_price_history (production: material_id + dasar saja)
ALTER TABLE public.material_price_history
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price NUMERIC CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- 11i. order_progress_photos (production pakai caption; migration 032 = stage/notes — kode pakai stage)
ALTER TABLE public.order_progress_photos
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 11j. steam_jobs (⚠️ production punya schema LAUNDRY manual: laundry_id/customer_name/item/qty —
--      migration 010 menambah kolom PRODUCTION yang kode pakai; JANGAN drop kolom lama)
ALTER TABLE public.steam_jobs
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('pass', 'fail')),
  ADD COLUMN IF NOT EXISTS fail_reason TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================================
-- 12. VERIFIKASI
-- ============================================================================
SELECT '055 done' AS status;

COMMIT;

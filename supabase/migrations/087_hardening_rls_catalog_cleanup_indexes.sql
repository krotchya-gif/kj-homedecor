-- ============================================================
-- Migration 087 — audit menyeluruh (2026-08-13)
-- Phase A: RLS hardening katalog & helper
-- Phase B: cleanup duplikat cash_accounts
-- Phase C: index FK hot + drop index tak terpakai
-- Phase D: order_totals INVOKER + search_path fungsi
-- ============================================================

-- ---------- PHASE A: RLS katalog publik → write admin/owner, SELECT publik ----------
DROP POLICY IF EXISTS "Auth can write products" ON public.products;
CREATE POLICY "Admin manage products" ON public.products
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

DROP POLICY IF EXISTS "Auth can write categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

DROP POLICY IF EXISTS "Auth can write banners" ON public.banners;
CREATE POLICY "Admin manage banners" ON public.banners
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

DROP POLICY IF EXISTS "Auth can write portfolio" ON public.portfolio_posts;
CREATE POLICY "Admin manage portfolio_posts" ON public.portfolio_posts
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- bom (data biaya → read staff, write admin/owner)
DROP POLICY IF EXISTS "Authenticated staff access" ON public.bom;
CREATE POLICY "BOM staff read" ON public.bom
  FOR SELECT USING (public.is_staff_active_sd());
CREATE POLICY "Admin manage bom" ON public.bom
  FOR ALL USING (public.is_admin_or_owner_sd()) WITH CHECK (public.is_admin_or_owner_sd());

-- users: SELECT dibatasi staff aktif
DROP POLICY IF EXISTS "All staff read users" ON public.users;
CREATE POLICY "All staff read users" ON public.users
  FOR SELECT USING (public.is_staff_active_sd());

-- ---------- PHASE A: REVOKE anon/PUBLIC dari helper SECURITY DEFINER ----------
REVOKE EXECUTE ON FUNCTION public.is_finance_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO authenticated;

-- ---------- PHASE B: cleanup duplikat cash_accounts (sisakan 1 baris per akun) ----------
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.cash_accounts
)
DELETE FROM public.cash_accounts ca
USING ranked r
WHERE ca.id = r.id AND r.rn > 1;

-- ---------- PHASE C: index FK hot ----------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_piutang_customer_id ON public.piutang(customer_id);
CREATE INDEX IF NOT EXISTS idx_piutang_order_id ON public.piutang(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material_id ON public.inventory_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON public.materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_pr_id ON public.purchase_orders(pr_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_material_id ON public.purchase_requests(material_id);
CREATE INDEX IF NOT EXISTS idx_production_jobs_order_id ON public.production_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_item_id ON public.returns(order_item_id);

-- ---------- PHASE C: drop index tak terpakai (advisory) ----------
DROP INDEX IF EXISTS public.idx_piutang_channel;
DROP INDEX IF EXISTS public.idx_ib_revision_status;
DROP INDEX IF EXISTS public.idx_production_jobs_revision_of;
DROP INDEX IF EXISTS public.idx_production_jobs_revision_round;
DROP INDEX IF EXISTS public.idx_inventory_movements_production_job_id;
DROP INDEX IF EXISTS public.idx_omc_production_job_id;
DROP INDEX IF EXISTS public.idx_production_reports_job_id;

-- ---------- PHASE D: order_totals view → SECURITY INVOKER ----------
ALTER VIEW public.order_totals SET (security_invoker = true);

-- ---------- PHASE D: SET search_path fungsi ----------
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE SQL
SET search_path = public
AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(order_number FROM 'ORD-\d{4}-(\d+)$')::int)
       FROM public.orders WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
      0) + 1 AS TEXT), 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_survey_number()
RETURNS TEXT
LANGUAGE SQL
SET search_path = public
AS $$
  SELECT 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(survey_number FROM 'KJ-\d{8}-(\d+)$')::int)
       FROM public.surveys WHERE survey_number LIKE 'KJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'),
      0) + 1 AS TEXT), 3, '0');
$$;

NOTIFY pgrst, 'reload schema';

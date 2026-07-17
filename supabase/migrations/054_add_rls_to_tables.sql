-- Migration 054: Add RLS to tables missing it
-- Fixes Critical #6
--
-- Tables that need RLS enabled and policies:
-- 1. style_rates        — Created in 013, no RLS
-- 2. laundry_orders     — Created in 011, no RLS
-- 3. laundry_rates      — Created in 011, no RLS
-- 4. laundry_payroll    — Created in 011, no RLS
-- 5. order_material_consumption — Created in 051, no RLS
--
-- Pattern:
--   - SELECT: all authenticated users
--   - INSERT/UPDATE/DELETE: admin/owner only
--   - Special cases noted per table

BEGIN;

-- ============================================================
-- 1. style_rates
-- ============================================================
ALTER TABLE IF EXISTS public.style_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "style_rates_select" ON public.style_rates;
CREATE POLICY "style_rates_select" ON public.style_rates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "style_rates_insert" ON public.style_rates;
CREATE POLICY "style_rates_insert" ON public.style_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "style_rates_update" ON public.style_rates;
CREATE POLICY "style_rates_update" ON public.style_rates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "style_rates_delete" ON public.style_rates;
CREATE POLICY "style_rates_delete" ON public.style_rates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- 2. laundry_orders
--    Note: Staff need write access for status updates (assigning, completing).
--    INSERT: admin/owner only
--    UPDATE: admin/owner + assigned staff can update their own orders
--    SELECT: all authenticated
--    DELETE: admin/owner only
-- ============================================================
ALTER TABLE IF EXISTS public.laundry_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laundry_orders_select" ON public.laundry_orders;
CREATE POLICY "laundry_orders_select" ON public.laundry_orders
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "laundry_orders_insert" ON public.laundry_orders;
CREATE POLICY "laundry_orders_insert" ON public.laundry_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "laundry_orders_update" ON public.laundry_orders;
CREATE POLICY "laundry_orders_update" ON public.laundry_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
    OR
    assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "laundry_orders_delete" ON public.laundry_orders;
CREATE POLICY "laundry_orders_delete" ON public.laundry_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- 3. laundry_rates
-- ============================================================
ALTER TABLE IF EXISTS public.laundry_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laundry_rates_select" ON public.laundry_rates;
CREATE POLICY "laundry_rates_select" ON public.laundry_rates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "laundry_rates_insert" ON public.laundry_rates;
CREATE POLICY "laundry_rates_insert" ON public.laundry_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "laundry_rates_update" ON public.laundry_rates;
CREATE POLICY "laundry_rates_update" ON public.laundry_rates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "laundry_rates_delete" ON public.laundry_rates;
CREATE POLICY "laundry_rates_delete" ON public.laundry_rates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- 4. laundry_payroll
--    Restricted: finance, admin, and owner only
-- ============================================================
ALTER TABLE IF EXISTS public.laundry_payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laundry_payroll_select" ON public.laundry_payroll;
CREATE POLICY "laundry_payroll_select" ON public.laundry_payroll
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'finance')
    )
  );

DROP POLICY IF EXISTS "laundry_payroll_insert" ON public.laundry_payroll;
CREATE POLICY "laundry_payroll_insert" ON public.laundry_payroll
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'finance')
    )
  );

DROP POLICY IF EXISTS "laundry_payroll_update" ON public.laundry_payroll;
CREATE POLICY "laundry_payroll_update" ON public.laundry_payroll
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'finance')
    )
  );

DROP POLICY IF EXISTS "laundry_payroll_delete" ON public.laundry_payroll;
CREATE POLICY "laundry_payroll_delete" ON public.laundry_payroll
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'finance')
    )
  );

-- ============================================================
-- 5. order_material_consumption
--    All authenticated can read (for HPP/traceability views).
--    Write restricted to admin/gudang/owner (gudang needs to record material usage).
-- ============================================================
ALTER TABLE IF EXISTS public.order_material_consumption ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "omc_select" ON public.order_material_consumption;
CREATE POLICY "omc_select" ON public.order_material_consumption
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "omc_insert" ON public.order_material_consumption;
CREATE POLICY "omc_insert" ON public.order_material_consumption
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner')
    )
  );

DROP POLICY IF EXISTS "omc_update" ON public.order_material_consumption;
CREATE POLICY "omc_update" ON public.order_material_consumption
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner')
    )
  );

DROP POLICY IF EXISTS "omc_delete" ON public.order_material_consumption;
CREATE POLICY "omc_delete" ON public.order_material_consumption
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner')
    )
  );

COMMIT;

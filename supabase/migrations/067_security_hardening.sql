-- Migration 067: Finance & Security hardening (idempotent)
-- Date: 2026-08-12
-- Isi:
--   1. Akun 'Penjualan Retur' (contra revenue) + mapping sales_return (F-9)
--   2. Kolom piutang.remaining (dipakai kode, tidak ada di migration 022) (F-15)
--   3. RLS role-based utk tabel yg masih terbuka: laundry_payroll, laundry_rates,
--      style_rates, assets, account_categories (F-3)
--   4. Policy TikTok: revoke anon + role owner/admin/finance (F-4)
--   5. users: DELETE/UPDATE hanya admin/owner (F-3)
--   6. RPC stock + consume_materials + advance_install_booking_status:
--      role check + REVOKE PUBLIC/anon (F-5)

BEGIN;

-- ============================================================
-- 1. Akun Penjualan Retur + mapping sales_return (F-9)
--    Refund = uang kembali ke customer = mengurangi omzet.
--    Dr Penjualan Retur (contra revenue) / Cr Kas.
-- ============================================================
INSERT INTO public.accounts (id, code, name, type, category_id, is_cash_account, description)
VALUES (
  '55555555-5555-4555-8555-555555555503',
  '4103',
  'Penjualan Retur',
  'revenue',
  '11111111-1111-4111-8111-111111111107',
  false,
  'Pengurang omzet saat barang diretur / refund ke customer'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description;

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active)
VALUES (
  'sales_return',
  '55555555-5555-4555-8555-555555555503', -- Penjualan Retur
  '22222222-2222-4222-8222-222222222204', -- Xendit Cash (default; form bisa pilih kas lain)
  'Refund/retur - Penjualan Retur (Debit) / Kas (Kredit)',
  true
)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description,
  is_active = true;

-- Mapping lama refund_issued (Dr Piutang / Cr Kas) di-NONAKTIFKAN
-- (menciptakan piutang baru yang salah secara akuntansi).
UPDATE public.account_mappings
SET is_active = false
WHERE transaction_type = 'refund_issued';

-- ============================================================
-- 2. Kolom piutang.remaining (F-15) — dipakai kode di faktur/process/tiktok
-- ============================================================
ALTER TABLE public.piutang ADD COLUMN IF NOT EXISTS remaining NUMERIC DEFAULT 0;

-- ============================================================
-- 3. RLS role-based tabel yang masih terbuka (F-3)
--    Pola: SELECT semua staff; INSERT/UPDATE/DELETE hanya finance/admin/owner
-- ============================================================

-- laundry_payroll (055 membuat policy permisif)
DROP POLICY IF EXISTS "Authenticated users can manage laundry payroll" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.laundry_payroll;
DROP POLICY IF EXISTS "Finance can manage laundry payroll" ON public.laundry_payroll;
CREATE POLICY "All staff read laundry_payroll" ON public.laundry_payroll
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_payroll" ON public.laundry_payroll
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- laundry_rates
DROP POLICY IF EXISTS "Authenticated users can manage laundry rates" ON public.laundry_rates;
CREATE POLICY "All staff read laundry_rates" ON public.laundry_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage laundry_rates" ON public.laundry_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- style_rates
DROP POLICY IF EXISTS "Authenticated users can manage style rates" ON public.style_rates;
CREATE POLICY "All staff read style_rates" ON public.style_rates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage style_rates" ON public.style_rates
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- assets
DROP POLICY IF EXISTS "Authenticated users can manage assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.assets;
CREATE POLICY "All staff read assets" ON public.assets
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage assets" ON public.assets
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- account_categories
DROP POLICY IF EXISTS "Authenticated users can manage account categories" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.account_categories;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.account_categories;
CREATE POLICY "All staff read account_categories" ON public.account_categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_categories" ON public.account_categories
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- payments & journal_entries: drop policy permisif dari 000 (nama beda dgn 063)
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.payments;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.journal_lines;

-- ============================================================
-- 4. Policy TikTok (F-4): owner_all_* isinya USING(true) — harus role-based
-- ============================================================
DROP POLICY IF EXISTS "owner_all_tiktok_settings" ON public.tiktok_shop_settings;
DROP POLICY IF EXISTS "owner_all_tiktok_orders" ON public.tiktok_shop_orders;
DROP POLICY IF EXISTS "owner_all_tiktok_statements" ON public.tiktok_shop_statements;

REVOKE ALL ON public.tiktok_shop_settings FROM anon;
REVOKE ALL ON public.tiktok_shop_orders FROM anon;
REVOKE ALL ON public.tiktok_shop_statements FROM anon;

-- SELECT: owner/admin/finance (data settlement & kredensial sensitif)
CREATE POLICY "TikTok staff read settings" ON public.tiktok_shop_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance'))
  );
CREATE POLICY "TikTok staff read orders" ON public.tiktok_shop_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance'))
  );
CREATE POLICY "TikTok staff read statements" ON public.tiktok_shop_statements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin','finance'))
  );

-- WRITE: owner/admin saja
CREATE POLICY "TikTok owner manage settings" ON public.tiktok_shop_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  );
CREATE POLICY "TikTok owner manage orders" ON public.tiktok_shop_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  );
CREATE POLICY "TikTok owner manage statements" ON public.tiktok_shop_statements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('owner','admin'))
  );

-- ============================================================
-- 5. users: DELETE/UPDATE hanya admin/owner (F-3)
--    SELECT tetap semua staff (dibutuhkan referensi nama di banyak halaman).
-- ============================================================
DROP POLICY IF EXISTS "Authenticated staff (full) access" ON public.users;
DROP POLICY IF EXISTS "Authenticated staff access" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

CREATE POLICY "All staff read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage users" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('admin','owner'))
  );

-- ============================================================
-- 6. RPC stock & pipeline: role check + revoke (F-5)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_stock_toko(product_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')
  ) THEN
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
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')
  ) THEN
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
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND status = 'active' AND role IN ('gudang','admin','owner')
  ) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;
  UPDATE public.materials
  SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - GREATEST(amount, 0), 0)
  WHERE id = material_id;
END;
$$;

-- consume_materials_for_production: role gudang/admin/owner
-- (logika asli dari migration 051 dipertahankan; hanya ditambah role check)
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
  -- F-5 fix: role check gudang/admin/owner
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = COALESCE(p_consumed_by, auth.uid())
      AND status = 'active' AND role IN ('gudang','admin','owner')
  ) THEN
    RAISE EXCEPTION 'Forbidden: hanya gudang/admin/owner';
  END IF;

  -- Validate production_job_id exists
  IF NOT EXISTS (SELECT 1 FROM production_jobs WHERE id = p_production_job_id) THEN
    RAISE EXCEPTION 'production_job_id % tidak ditemukan', p_production_job_id;
  END IF;

  -- Idempotency: cek apakah sudah pernah di-consume
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

  -- Iterate order_items, lookup BOM, decrement stock
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
         'BOM consumption - production job ' || p_production_job_id::text,
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

-- advance_install_booking_status: admin/owner ATAU installer pemilik booking
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
  -- F-5 fix: role check — admin/owner, atau installer yang punya booking ini
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = COALESCE(p_staff_id, auth.uid())
      AND status = 'active' AND role IN ('admin','owner')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM install_bookings ib
      WHERE ib.id = p_booking_id
        AND ib.installer_id = COALESCE(p_staff_id, auth.uid())
    ) INTO v_is_owner_installer;
    IF NOT v_is_owner_installer THEN
      RAISE EXCEPTION 'Forbidden: bukan admin/owner atau installer booking ini';
    END IF;
  END IF;

  -- Get booking info
  SELECT ib.order_id, ib.status, ib.type
    INTO v_order_id, v_old_status, v_booking_type
  FROM install_bookings ib
  WHERE ib.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'install_bookings.id % tidak ditemukan', p_booking_id;
  END IF;

  IF p_new_status NOT IN ('pending','scheduled','in_progress','done','revision','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %. Valid: pending, scheduled, in_progress, done, revision, cancelled', p_new_status;
  END IF;

  UPDATE install_bookings
  SET status = p_new_status
  WHERE id = p_booking_id;

  IF v_booking_type = 'pasang' AND v_order_id IS NOT NULL THEN
    SELECT classification INTO v_order_classification FROM orders WHERE id = v_order_id;

    IF v_order_classification = 'pasang' THEN
      IF p_new_status = 'scheduled' THEN
        UPDATE orders SET status = 'scheduled' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id, 'Install booking scheduled -> orders.status auto-advance ke scheduled');
      ELSIF p_new_status = 'in_progress' THEN
        UPDATE orders SET status = 'installing' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id, 'Install sedang berjalan -> orders.status auto-advance ke installing');
      ELSIF p_new_status = 'done' THEN
        UPDATE orders SET status = 'done' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_done', p_staff_id, 'Install selesai -> orders.status auto-advance ke done');
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

-- Revoke PUBLIC/anon dari RPC stock & pipeline
REVOKE ALL ON FUNCTION public.increment_stock_toko FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_stock_toko FROM anon;
REVOKE ALL ON FUNCTION public.increment_stock_gudang FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_stock_gudang FROM anon;
REVOKE ALL ON FUNCTION public.decrement_stock_gudang FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_stock_gudang FROM anon;
REVOKE ALL ON FUNCTION public.consume_materials_for_production FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_materials_for_production FROM anon;
REVOKE ALL ON FUNCTION public.advance_install_booking_status FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_install_booking_status FROM anon;

GRANT EXECUTE ON FUNCTION public.increment_stock_toko TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_stock_gudang TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock_gudang TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_materials_for_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_install_booking_status TO authenticated;

COMMIT;

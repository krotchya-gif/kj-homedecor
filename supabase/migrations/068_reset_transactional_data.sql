-- Migration 068: Fitur Reset Data Transaksional (Owner Only)
-- Date: 2026-08-12
-- RPC reset_transactional_data(): hapus SEMUA data transaksional,
-- pertahankan master/seed (users, accounts, account_mappings, account_categories,
-- products, materials, suppliers, bom, style_rates, laundry_rates, categories,
-- landing_settings, banners, portfolio_posts, tiktok_shop_settings).
-- - cash_accounts: baris dipertahankan, balance di-reset ke 0
-- - stok: materials.stock_gudang & products.stock_toko di-reset ke 0
-- - HANYA owner (status active) yang boleh memanggil.

BEGIN;

CREATE OR REPLACE FUNCTION public.reset_transactional_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB;
  v_is_owner BOOLEAN;
BEGIN
  -- Role check: HANYA owner aktif
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Forbidden: hanya Owner yang bisa reset data';
  END IF;

  -- Hitung jumlah sebelum reset (untuk log)
  SELECT jsonb_build_object(
    'orders', (SELECT count(*) FROM public.orders),
    'payments', (SELECT count(*) FROM public.payments),
    'journal_entries', (SELECT count(*) FROM public.journal_entries),
    'customers', (SELECT count(*) FROM public.customers)
  ) INTO v_counts;

  -- ============================================================
  -- 1. Truncate tabel transaksional (CASCADE menarik semua relasi anak)
  -- ============================================================
  TRUNCATE TABLE
    public.customers,
    public.orders,
    public.install_bookings,
    public.surveys,
    public.production_jobs,
    public.production_reports,
    public.laundry_orders,
    public.laundry_payroll,
    public.laundry_records,
    public.lembur_records,
    public.purchase_requests,
    public.purchase_orders,
    public.inventory_movements,
    public.stock_opname_sessions,
    public.journal_entries,
    public.hutang,
    public.piutang,
    public.assets,
    public.tiktok_shop_orders,
    public.tiktok_shop_statements,
    public.material_price_history,
    public.low_stock_alerts,
    public.notifications
  CASCADE;

  -- ============================================================
  -- 2. cash_accounts: pertahankan baris, reset balance ke 0
  -- ============================================================
  UPDATE public.cash_accounts SET balance = 0, updated_at = NOW();

  -- ============================================================
  -- 3. Stok di-reset ke 0
  -- ============================================================
  UPDATE public.materials SET stock_gudang = 0, stock_toko = 0;
  UPDATE public.products SET stock_toko = 0;

  -- ============================================================
  -- 4. Buang tabel backup sampah dari migration 041
  -- ============================================================
  DROP TABLE IF EXISTS public.orders_pipeline_reset_backup_20260602;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Data transaksional berhasil di-reset',
    'counts_before', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_transactional_data FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_transactional_data FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_transactional_data TO authenticated;

COMMIT;

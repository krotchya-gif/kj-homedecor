-- ============================================================
-- 079 — Reset Data Hardening (aman + seed terlindungi) + drop seo_settings
-- ============================================================
-- Tujuan:
--   1. reset_transactional_data tidak lagi andal 100% ke FK CASCADE (risiko drift:
--      kalau live kehilangan FK, anak bisa ter-orphan diam-diam). TRUNCATE kini
--      EKSPLISIT menyebut semua tabel anak + legacy.
--   2. Verifikasi post-reset: setiap tabel target HARUS count = 0; jika ada sisa
--      (drift FK), RPC RAISE EXCEPTION → reset dianggap GAGAL, bukan sukses palsu.
--   3. Guard seed: setelah truncate, pastikan seed inti MASIH ADA (users, accounts,
--      account_mappings) → jika 0, RAISE (reset tidak boleh menghapus seed).
--   4. Drop tabel seo_settings (dead sejak migration 008 — 0 referensi di src/,
--      3 baris tak pernah dibaca; SEO aktif via landing_settings.seo_*).
-- Idempotent / aman untuk di-push.
-- ============================================================

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
  -- Role check: HANYA owner aktif
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Forbidden: hanya Owner yang bisa reset data';
  END IF;

  -- Hitung jumlah sebelum reset (untuk bukti di UI)
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

  -- ============================================================
  -- 1. Truncate SEMUA tabel transaksional (eksplisit — tidak andal CASCADE saja)
  -- ============================================================
  EXECUTE format('TRUNCATE TABLE %s CASCADE',
    (SELECT string_agg('public.' || quote_ident(t), ', ' ORDER BY t) FROM unnest(v_tables) t));

  -- ============================================================
  -- 2. Verifikasi post-reset: setiap tabel target HARUS 0 baris
  -- ============================================================
  FOREACH v_tbl IN ARRAY v_tables
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', v_tbl) INTO v_left;
    IF v_left > 0 THEN
      RAISE EXCEPTION 'Reset GAGAL: tabel % masih punya % baris (kemungkinan FK drift). Pembukuan dibiarkan utuh.',
        v_tbl, v_left;
    END IF;
  END LOOP;

  -- ============================================================
  -- 3. Guard seed: reset tidak boleh menghapus data master inti
  -- ============================================================
  SELECT
    (SELECT count(*) FROM public.users) >= 1
    AND (SELECT count(*) FROM public.accounts) >= 1
    AND (SELECT count(*) FROM public.account_mappings) >= 1
  INTO v_seed_ok;

  IF NOT v_seed_ok THEN
    RAISE EXCEPTION 'Reset GAGAL: seed master (users/accounts/account_mappings) kosong setelah reset — cek migrasi seed.';
  END IF;

  -- ============================================================
  -- 4. cash_accounts: pertahankan baris, reset balance ke 0
  -- ============================================================
  UPDATE public.cash_accounts SET balance = 0, updated_at = NOW();

  -- ============================================================
  -- 5. Stok di-reset ke 0 (baris produk/material TETAP — seed)
  -- ============================================================
  UPDATE public.materials SET stock_gudang = 0, stock_toko = 0;
  UPDATE public.products SET stock_toko = 0;

  -- ============================================================
  -- 6. Buang tabel backup sampah dari migration 041 (jika masih ada)
  -- ============================================================
  DROP TABLE IF EXISTS public.orders_pipeline_reset_backup_20260602;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Data transaksional berhasil di-reset. Seed master (staff, COA, produk, material, supplier, tarif, konten) dipertahankan.',
    'counts_before', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_transactional_data FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_transactional_data FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_transactional_data TO authenticated;

-- ============================================================
-- Drop tabel seo_settings (dead sejak migration 008; SEO aktif via
-- landing_settings.seo_*). Tidak ada FK ke/dari tabel ini — aman.
-- ============================================================
DROP TABLE IF EXISTS public.seo_settings;

NOTIFY pgrst, 'reload schema';

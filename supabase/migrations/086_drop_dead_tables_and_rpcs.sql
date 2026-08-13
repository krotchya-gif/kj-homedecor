-- Phase 6F (keputusan user 2026-08-13): hapus objek dead yang TIDAK dipakai kode.
-- RPC dead (0 referensi src & fungsi lain; rls_auto_enable DIPERTAHANKAN karena
-- dipanggil event trigger ensure_rls utk menegakkan RLS otomatis):
DROP FUNCTION IF EXISTS public.decrement_stock_gudang(uuid, numeric);
DROP FUNCTION IF EXISTS public.get_material_stock(uuid);
DROP FUNCTION IF EXISTS public.get_product_stock(uuid);
DROP FUNCTION IF EXISTS public.update_cash_account_balance(uuid, numeric);

-- Tabel dead (0 referensi kode; hanya dirujuk reset_transactional_data yang diupdate di bawah):
DROP TABLE IF EXISTS public.packing_checklists;
DROP TABLE IF EXISTS public.return_requests;
DROP TABLE IF EXISTS public.order_preparation_checklist;

-- CATATAN: low_stock_alerts & order_material_consumption DIPERTAHANKAN —
-- ditulis oleh consume_materials_for_production (RPC produksi aktif).

-- Update reset_transactional_data: hapus 3 tabel yang sudah di-drop dari daftar TRUNCATE.
CREATE OR REPLACE FUNCTION public.reset_transactional_data()
RETURNS jsonb
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
    'order_preparation_checklists','order_progress_photos',
    'payments','returns','qc_records','steam_jobs',
    'install_checklists','journal_lines','stock_opname_items',
    'survey_rooms','survey_room_photos','survey_logs'
  ];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Forbidden: hanya Owner yang bisa reset data';
  END IF;

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

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Data transaksional berhasil di-reset. Seed master (staff, COA, produk, material, supplier, tarif, konten) dipertahankan.',
    'counts_before', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_transactional_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_transactional_data() FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_transactional_data() TO authenticated;

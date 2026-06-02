-- Migration 050: Drop outdated CHECK constraints (leftover dari migration awal)
-- Date: 2026-06-02
-- Reason: Migration 001 membuat 'orders_status_check' dengan whitelist original.
--          Migration 003 dan 007 membuat 'chk_order_status' yang lebih updated
--          tapi TIDAK drop 'orders_status_check' yang lama.
--
-- Akibat: PostgREST strict check — query di-reject karena salah satu
--          constraint TIDAK punya value yang di-query.
--          Contoh: query `status=in.(ready,packed,shipped)` di admin/shipping
--          return 400 karena 'orders_status_check' TIDAK punya 'ready'.
--
-- Solusi: Drop constraints outdated. Pertahankan hanya yang paling up-to-date
--         per kolom.

BEGIN;

-- ============================================================
-- 1. orders table: drop outdated 'orders_status_check'
--    Keep 'chk_order_status' (V2, paling up-to-date dengan 11 values)
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- ============================================================
-- 2. Refresh PostgREST schema cache
--    PENTING: tanpa ini, PostgREST masih pakai cache lama dengan 2 constraints
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 3. Verification query (akan return rows dari constraint yang tersisa)
-- ============================================================
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass
    AND contype = 'c'
    AND conname IN ('chk_order_status', 'orders_status_check');

  IF constraint_count > 1 THEN
    RAISE EXCEPTION 'Masih ada % CHECK constraints untuk orders.status. Expected: 1 (chk_order_status saja)', constraint_count;
  END IF;

  RAISE NOTICE '✅ orders table sekarang punya % CHECK constraint untuk status (expected: 1)', constraint_count;
END $$;

COMMIT;

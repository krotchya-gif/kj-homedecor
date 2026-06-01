-- Migration 041: Reset pipeline to sorted (clean slate after refactor)
-- Date: 2026-06-02
-- Reason: Pipeline order changed — payment_ok moved from after-sorted to between ready and packed.
--          All existing orders in production/steam/ready/payment_ok/packed/shipped/done are reset
--          to 'sorted' so Admin can re-process them under the new pipeline.

BEGIN;

-- Backup before reset
CREATE TABLE IF NOT EXISTS public.orders_pipeline_reset_backup_20260602 AS
  SELECT id, status, payment_status, total_amount, dp_amount, lunas_amount, updated_at
  FROM public.orders
  WHERE status NOT IN ('new', 'sorted', 'cancelled');

-- Reset to sorted
UPDATE public.orders
SET status = 'sorted'
WHERE status NOT IN ('new', 'sorted', 'cancelled');

-- Log the reset
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Reset % orders to status=sorted', affected_count;
END $$;

COMMIT;

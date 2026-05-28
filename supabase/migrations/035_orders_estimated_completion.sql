-- ============================================================
-- Add estimated_completion to orders for pipeline ETA tracking
-- ============================================================
-- Stores the calculated estimated completion timestamp.
-- Calculated from current status + default hours per status.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ;

COMMENT ON COLUMN orders.estimated_completion IS
  'Calculated ETA for order completion based on status progression and time-per-stage defaults.';

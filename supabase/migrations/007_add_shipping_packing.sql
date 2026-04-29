-- Migration 007: Shipping & Packing Flow
-- Adds tracking number, courier, packed_at/packed_by columns
-- Adds packed and shipped order statuses and log actions

-- ============================================================
-- 1. Add shipping columns to orders
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packed_by UUID REFERENCES public.users(id);

-- ============================================================
-- 2. Update order status constraint to include packed and shipped
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_order_status
  CHECK (status IN ('new','sorted','payment_ok','production','ready','packed','shipped','done','returned','cancelled'));

-- ============================================================
-- 3. Update order_logs action constraint to include packed and shipped
-- ============================================================
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS chk_action;
ALTER TABLE public.order_logs ADD CONSTRAINT chk_action
  CHECK (action IN ('created','sorted','payment_approved','production_started','production_done','qc_pass','qc_fail','ready','packed','shipped','installed','done'));

-- ============================================================
-- 4. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_packed_at ON public.orders(packed_at);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON public.orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_classification ON public.orders(classification);
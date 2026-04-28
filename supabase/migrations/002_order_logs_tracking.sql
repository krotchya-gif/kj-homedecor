-- Add order_logs table for audit trail / tracking confirmation at each pipeline step
CREATE TABLE IF NOT EXISTS public.order_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,  -- e.g. 'created', 'sorted', 'payment_approved', 'production_started', 'production_done', 'qc_pass', 'qc_fail', 'ready', 'installed', 'done'
  notes       TEXT,
  staff_id    UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups per order
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_action ON public.order_logs(action);

-- ============================================================
-- RLS for order_logs
-- ============================================================
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order logs" ON public.order_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated roles can insert order logs" ON public.order_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Add notes field to orders for internal admin notes
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ============================================================
-- Add shipping Tracking fields to orders
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES public.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installed_by UUID REFERENCES public.users(id);
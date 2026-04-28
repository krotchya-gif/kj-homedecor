-- Migration 003: Return & Refund Flow
-- Added for marketplace return handling (bagus→stock, rusak→dispose)

-- ============================================================
-- 1. Add 'returned' status to orders
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_order_status
  CHECK (status IN ('new','sorted','payment_ok','production','ready','done','returned','cancelled'));

-- ============================================================
-- 2. Add return types to inventory_movements.type
-- ============================================================
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS chk_movement_type;
ALTER TABLE public.inventory_movements ADD CONSTRAINT chk_movement_type
  CHECK (type IN ('in','out','transfer_out','transfer_in','return_in','dispose'));

-- ============================================================
-- 3. Add 'refund' type to payments
-- ============================================================
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_type;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_type
  CHECK (type IN ('dp','lunas','refund'));

-- ============================================================
-- 4. Returns table — tracks return requests dari marketplace/customer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.returns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id   UUID REFERENCES public.order_items(id),
  reason          TEXT NOT NULL,
  condition       TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good','damaged')),
  qty             NUMERIC DEFAULT 1,
  refund_amount   NUMERIC DEFAULT 0,
  refund_status   TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending','approved','rejected','completed')),
  approved_by     UUID REFERENCES public.users(id),
  created_by      UUID REFERENCES public.users(id),
  resolved_at     TIMESTAMPTZ,
  photo_evidence  TEXT[],  -- array of photo URLs
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view returns" ON public.returns
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and finance can insert returns" ON public.returns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins and finance can update returns" ON public.returns
  FOR UPDATE USING (auth.role() IN ('admin','finance','owner'));

-- ============================================================
-- 5. Add shipped_at / installed_at / shipped_by tracking to orders
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_by UUID REFERENCES public.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS installed_by UUID REFERENCES public.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- ============================================================
-- 6. Add returned_at to order_items for per-item return tracking
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- ============================================================
-- 7. Indexes for returns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(refund_status);
-- Migration 040: Stock Opname Schema
-- Stock opname sessions and items for physical inventory count

-- Sessions table: represents one opname counting session
CREATE TABLE IF NOT EXISTS public.stock_opname_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'submitted', 'approved', 'cancelled')),
  created_by  UUID REFERENCES public.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ
);

-- Items table: per-material count results within a session
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES public.stock_opname_sessions(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES public.materials(id),
  system_qty        NUMERIC NOT NULL DEFAULT 0,
  counted_qty       NUMERIC NOT NULL DEFAULT 0,
  difference        NUMERIC NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies — authenticated users with valid users.role IN (admin/gudang/owner/finance) can manage
ALTER TABLE public.stock_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items    ENABLE ROW LEVEL SECURITY;

-- Admin, Gudang, Owner, Finance can do ALL on sessions and items
CREATE POLICY "stock_opname_all"
  ON public.stock_opname_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner', 'finance')
    )
  );

CREATE POLICY "stock_opname_items_all"
  ON public.stock_opname_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner', 'finance')
    )
  );

-- Finance can view sessions too
CREATE POLICY "stock_opname_sessions_select"
  ON public.stock_opname_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner', 'finance')
    )
  );

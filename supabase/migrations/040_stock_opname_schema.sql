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

-- RLS policies
ALTER TABLE public.stock_opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items    ENABLE ROW LEVEL SECURITY;

-- Admin and Gudang can manage sessions
CREATE POLICY "Admin/Gudang can manage stock_opname_sessions"
  ON public.stock_opname_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner')
    )
  );

CREATE POLICY "Admin/Gudang can manage stock_opname_items"
  ON public.stock_opname_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'gudang', 'owner')
    )
  );

-- Owner can approve
CREATE POLICY "Owner can view all sessions"
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

-- Grant
GRANT USAGE ON SCHEMA public TO gudang, finance;
GRANT ALL ON public.stock_opname_sessions TO gudang, finance;
GRANT ALL ON public.stock_opname_items    TO gudang, finance;
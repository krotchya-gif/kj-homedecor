-- ============================================================
-- Material Price History — Track harga material per supplier
-- ============================================================
-- Setiap kali harga material berubah, catat di sini.
-- Berguna untuk negotiation & budgeting.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.material_price_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id   UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  price         NUMERIC NOT NULL CHECK (price >= 0),
  notes         TEXT,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff access" ON public.material_price_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Index untuk query cepat per material + waktu
CREATE INDEX IF NOT EXISTS idx_mph_material_recorded
  ON public.material_price_history(material_id, recorded_at DESC);

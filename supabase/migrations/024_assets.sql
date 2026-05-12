-- Asset Management (Manajemen Aset)
CREATE TABLE IF NOT EXISTS public.assets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                VARCHAR(20) UNIQUE,
  name                VARCHAR(255) NOT NULL,
  category            VARCHAR(100),
  location            VARCHAR(255),
  purchase_date       DATE,
  purchase_value      NUMERIC,
  depreciation_rate   NUMERIC DEFAULT 0,
  depreciation_method  VARCHAR(20) DEFAULT 'straight-line' CHECK (depreciation_method IN ('straight-line', 'declining-balance')),
  useful_life_years   NUMERIC DEFAULT 0,
  current_value       NUMERIC,
  accumulated_depreciation NUMERIC DEFAULT 0,
  status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'sold')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage assets" ON assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
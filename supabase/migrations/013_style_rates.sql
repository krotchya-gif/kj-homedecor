-- Style rates table: admin-configurable per-meter rates for gorden styles
CREATE TABLE style_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style TEXT UNIQUE NOT NULL,
  rate_per_meter NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO style_rates (style, rate_per_meter) VALUES
  ('smokring', 5000),
  ('kaitan', 4000),
  ('kupu-kupu', 6000),
  ('romanshade', 7000);

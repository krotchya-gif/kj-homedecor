-- Accounts Payable (Hutang)
CREATE TABLE IF NOT EXISTS public.hutang (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id     UUID REFERENCES suppliers(id),
  invoice_number  VARCHAR(50),
  invoice_date    DATE,
  due_date        DATE,
  amount          NUMERIC NOT NULL DEFAULT 0,
  paid_amount     NUMERIC DEFAULT 0,
  return_amount   NUMERIC DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hutang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage hutang" ON hutang FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_hutang_supplier ON hutang(supplier_id);
CREATE INDEX idx_hutang_status ON hutang(status);
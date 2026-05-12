-- Accounts Receivable (Piutang)
CREATE TABLE IF NOT EXISTS public.piutang (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES customers(id),
  channel         VARCHAR(50),
  invoice_number  VARCHAR(50),
  invoice_date    DATE,
  due_date        DATE,
  amount          NUMERIC NOT NULL DEFAULT 0,
  paid_amount     NUMERIC DEFAULT 0,
  return_amount   NUMERIC DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  order_id        UUID REFERENCES orders(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE piutang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage piutang" ON piutang FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_piutang_customer ON piutang(customer_id);
CREATE INDEX idx_piutang_channel ON piutang(channel);
CREATE INDEX idx_piutang_order ON piutang(order_id);
CREATE INDEX idx_piutang_status ON piutang(status);
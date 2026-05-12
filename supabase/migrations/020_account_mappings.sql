-- Account Mappings for automatic journal entries
CREATE TABLE IF NOT EXISTS public.account_mappings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_type  VARCHAR(50) NOT NULL,
  debit_account_id  UUID REFERENCES accounts(id),
  credit_account_id UUID REFERENCES accounts(id),
  description       TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage mappings" ON account_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default mappings for common transactions
INSERT INTO account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('order_created', NULL, NULL, 'Journal when new order is created'),
  ('payment_received', NULL, NULL, 'Journal when customer payment is received'),
  ('expense_paid', NULL, NULL, 'Journal when expense is paid');
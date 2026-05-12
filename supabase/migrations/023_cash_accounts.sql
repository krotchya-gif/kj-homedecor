-- Cash Accounts (Kas dan Bank)
CREATE TABLE IF NOT EXISTS public.cash_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID REFERENCES accounts(id),
  bank_name       VARCHAR(100),
  account_number  VARCHAR(50),
  account_holder  VARCHAR(255),
  balance         NUMERIC DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cash accounts" ON cash_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_cash_accounts_bank ON cash_accounts(bank_name);
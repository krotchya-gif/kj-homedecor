-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  category_id   UUID,
  parent_id     UUID REFERENCES accounts(id),
  is_cash_account BOOLEAN DEFAULT false,
  balance       NUMERIC DEFAULT 0,
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage accounts" ON accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_code ON accounts(code);
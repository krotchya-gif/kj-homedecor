-- Account Categories
CREATE TABLE IF NOT EXISTS public.account_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage categories" ON account_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add foreign key to accounts
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_category FOREIGN KEY (category_id) REFERENCES account_categories(id);
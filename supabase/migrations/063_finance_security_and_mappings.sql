-- Migration 063: Finance Security & Mapping Fixes (BUG-018, BUG-019, BUG-012/013/014/017)
-- Date: 2026-08-11
-- Isi:
--   1. Hapus backdoor exec_sql (BUG-018)
--   2. Helper is_finance_role() untuk RLS & RPC role check (BUG-019)
--   3. RLS role-based untuk tabel keuangan (payments, journal_*, accounts, mappings, cash, hutang, piutang)
--   4. Perbaiki policy returns yang dead (BUG-012) — pakai is_finance_role()
--   5. RPC update_cash_account_balance: tambah role check (BUG-019)
--   6. Seed mapping baru: refund_issued, hutang_paid, piutang_received, ecommerce_fee (BUG-012/013/014/017)

BEGIN;

-- ============================================================
-- 1. BUG-018: Hapus backdoor exec_sql (tidak dipakai src/ sama sekali)
--    Note: pakai loop DO (bukan DROP IF EXISTS + REVOKE) karena
--    REVOKE tidak punya IF EXISTS -> 42883 kalau fungsi tak ada.
--    DROP FUNCTION otomatis mencabut semua privilege.
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS proc
    FROM pg_proc p
    JOIN pg_namespace n ON n.nspname = 'public' AND p.pronamespace = n.oid
    WHERE p.proname = 'exec_sql'
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.proc);
  END LOOP;
END $$;

-- ============================================================
-- 2. Helper role finance/admin/owner (dipakai RLS & RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_finance_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND status = 'active'
      AND role IN ('finance', 'admin', 'owner')
  );
$$;

REVOKE ALL ON FUNCTION public.is_finance_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_finance_role() TO authenticated;

-- ============================================================
-- 3. BUG-019: RLS role-based tabel keuangan
--    Pola: SELECT semua staff; INSERT/UPDATE/DELETE hanya finance/admin/owner
-- ============================================================

-- payments
DROP POLICY IF EXISTS "Authenticated staff access" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payments" ON public.payments;
CREATE POLICY "All staff read payments" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage payments" ON public.payments
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- journal_entries
DROP POLICY IF EXISTS "Authenticated staff access" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated users can manage journals" ON public.journal_entries;
CREATE POLICY "All staff read journal_entries" ON public.journal_entries
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_entries" ON public.journal_entries
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- journal_lines
DROP POLICY IF EXISTS "Authenticated users can manage journal lines" ON public.journal_lines;
CREATE POLICY "All staff read journal_lines" ON public.journal_lines
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage journal_lines" ON public.journal_lines
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- accounts
DROP POLICY IF EXISTS "Authenticated users can manage accounts" ON public.accounts;
CREATE POLICY "All staff read accounts" ON public.accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage accounts" ON public.accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- account_mappings
DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.account_mappings;
CREATE POLICY "All staff read account_mappings" ON public.account_mappings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage account_mappings" ON public.account_mappings
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- cash_accounts
DROP POLICY IF EXISTS "Authenticated users can manage cash accounts" ON public.cash_accounts;
CREATE POLICY "All staff read cash_accounts" ON public.cash_accounts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage cash_accounts" ON public.cash_accounts
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- hutang
DROP POLICY IF EXISTS "Authenticated users can manage hutang" ON public.hutang;
CREATE POLICY "All staff read hutang" ON public.hutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage hutang" ON public.hutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- piutang
DROP POLICY IF EXISTS "Authenticated users can manage piutang" ON public.piutang;
CREATE POLICY "All staff read piutang" ON public.piutang
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance can manage piutang" ON public.piutang
  FOR ALL USING (public.is_finance_role()) WITH CHECK (public.is_finance_role());

-- ============================================================
-- 4. BUG-012: Perbaiki policy returns yang dead
--    (auth.role() IN ('admin','finance','owner') tidak pernah cocok)
-- ============================================================
DROP POLICY IF EXISTS "Admins and finance can update returns" ON public.returns;
CREATE POLICY "Finance can update returns" ON public.returns
  FOR UPDATE USING (public.is_finance_role());

-- ============================================================
-- 5. BUG-019: RPC update_cash_account_balance — tambah role check
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_cash_account_balance(p_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finance_role() THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;
  UPDATE public.cash_accounts
  SET balance = COALESCE(balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_cash_account_balance FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_cash_account_balance FROM anon;
GRANT EXECUTE ON FUNCTION public.update_cash_account_balance TO authenticated;

-- ============================================================
-- 6. Mapping baru (BUG-012/013/014/017) — idempotent
-- ============================================================

-- Refund ke customer: Dr Piutang Customer / Cr Xendit Cash (membalik payment_received)
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active) VALUES
  ('refund_issued',
   '22222222-2222-4222-8222-222222222205'::uuid,  -- Piutang Customer
   '22222222-2222-4222-8222-222222222204'::uuid,  -- Xendit Cash
   'Refund — Piutang (Debit) / Kas (Kredit)', true)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description,
  is_active = true;

-- Bayar hutang supplier: Dr Hutang Supplier / Cr Kas
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active) VALUES
  ('hutang_paid',
   '33333333-3333-4333-8333-333333333301'::uuid,  -- Hutang Supplier
   '22222222-2222-4222-8222-222222222201'::uuid,  -- Kas
   'Bayar hutang — Hutang Supplier (Debit) / Kas (Kredit)', true)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description,
  is_active = true;

-- Terima pembayaran piutang faktur: Dr Kas / Cr Piutang Customer
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active) VALUES
  ('piutang_received',
   '22222222-2222-4222-8222-222222222201'::uuid,  -- Kas
   '22222222-2222-4222-8222-222222222205'::uuid,  -- Piutang Customer
   'Terima piutang — Kas (Debit) / Piutang (Kredit)', true)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description,
  is_active = true;

-- Biaya/komisi e-commerce: Dr Beban / Cr Piutang (potongan settlement marketplace)
UPDATE public.accounts
SET name = 'Beban Biaya Lain E-commerce', description = 'Komisi, iklan, fee marketplace (selisih gross vs net settlement)'
WHERE id = '66666666-6666-4666-8666-666666666606'::uuid;

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description, is_active) VALUES
  ('ecommerce_fee',
   '66666666-6666-4666-8666-666666666606'::uuid,  -- Beban Biaya Lain E-commerce
   '22222222-2222-4222-8222-222222222205'::uuid,  -- Piutang Customer
   'Komisi/biaya marketplace — Beban (Debit) / Piutang (Kredit)', true)
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description = EXCLUDED.description,
  is_active = true;

COMMIT;

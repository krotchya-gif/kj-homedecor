-- Migration 064: Atomic journal creation + idempotency + kas live
-- Date: 2026-08-12
-- Fix: F-19 (jurnal + saldo kas tidak atomik), F-57 (insert 2 query + rollback manual),
--      F-54 (tidak ada idempotency key → klik ganda bikin jurnal ganda)
--
-- Isi:
--   1. Kolom journal_entries.idempotency_key + UNIQUE partial index
--   2. RPC create_journal_atomic: role check, insert entry+lines SATU transaksi,
--      update saldo cash_accounts untuk baris akun kas, idempotent via key

BEGIN;

-- ============================================================
-- 1. Idempotency key (F-54)
-- ============================================================
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_idempotency_unique
  ON public.journal_entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 2. RPC atomik: create_journal_atomic (F-19, F-57, F-54)
--    - Role check: finance/admin/owner ATAU service_role (server/webhook)
--    - p_lines JSONB: [{"account_id","debit","credit","description"}]
--    - Idempotent: key sama → kembalikan entry yang sudah ada (tanpa duplikat)
--    - Update saldo cash_accounts untuk akun kas dalam SATU transaksi
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_journal_atomic(
  p_idempotency_key TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_entry_date DATE,
  p_is_auto BOOLEAN,
  p_lines JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
  v_line RECORD;
  v_duplicate UUID;
  v_result JSONB;
BEGIN
  -- Role check (BUG-019 pola; service_role = server/webhook internal)
  IF NOT public.is_finance_role() AND auth.jwt() ->> 'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Minimal 1 baris jurnal';
  END IF;

  -- Idempotency: kalau key sudah dipakai, kembalikan entry yang ada
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_duplicate FROM public.journal_entries WHERE idempotency_key = p_idempotency_key;
    IF v_duplicate IS NOT NULL THEN
      SELECT jsonb_build_object(
        'id', id,
        'idempotent', true,
        'entry_date', entry_date,
        'description', description
      ) INTO v_result FROM public.journal_entries WHERE id = v_duplicate;
      RETURN v_result;
    END IF;
  END IF;

  -- Validasi balance + hitung total
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC)
  LOOP
    IF v_line.account_id IS NULL THEN
      RAISE EXCEPTION 'account_id wajib di setiap baris';
    END IF;
    IF (v_line.debit > 0) = (v_line.credit > 0) THEN
      RAISE EXCEPTION 'Setiap baris harus punya tepat satu sisi (debit ATAU credit)';
    END IF;
    v_total_debit := v_total_debit + COALESCE(v_line.debit, 0);
    v_total_credit := v_total_credit + COALESCE(v_line.credit, 0);
  END LOOP;

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal tidak balance — debit %, credit %', v_total_debit, v_total_credit;
  END IF;

  -- Insert entry + lines (SATU transaksi — PostgREST jalankan RPC dalam transaksi)
  INSERT INTO public.journal_entries (
    entry_date, description, reference_type, reference_id,
    total_debit, total_credit, is_auto, created_by, idempotency_key
  ) VALUES (
    p_entry_date, p_description, p_reference_type, p_reference_id,
    v_total_debit, v_total_credit, COALESCE(p_is_auto, false), p_created_by, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_lines (entry_id, account_id, debit, credit, description)
  SELECT
    v_entry_id,
    (x.record).account_id,
    COALESCE((x.record).debit, 0),
    COALESCE((x.record).credit, 0),
    COALESCE((x.record).description, NULL)
  FROM (
    SELECT * FROM jsonb_to_recordset(p_lines) AS x(account_id UUID, debit NUMERIC, credit NUMERIC, description TEXT)
  ) x;

  -- F-19: update saldo kas untuk akun bertipe kas (atomik dengan jurnal)
  UPDATE public.cash_accounts ca
  SET balance = COALESCE(ca.balance, 0) + t.delta,
      updated_at = NOW()
  FROM (
    SELECT account_id, SUM(debit - credit) AS delta
    FROM public.journal_lines
    WHERE entry_id = v_entry_id
    GROUP BY account_id
  ) t
  WHERE ca.account_id = t.account_id;

  SELECT jsonb_build_object(
    'id', v_entry_id,
    'idempotent', false,
    'entry_date', p_entry_date,
    'description', p_description
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_journal_atomic FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_journal_atomic FROM anon;
GRANT EXECUTE ON FUNCTION public.create_journal_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_journal_atomic TO service_role;

COMMIT;

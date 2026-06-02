-- Migration 048: Seed default Chart of Accounts + populate account_mappings
-- Date: 2026-06-02
-- Reason: Migration 020 seed account_mappings dengan debit/credit_account_id = NULL,
--          sehingga createSimpleJournal('payment_received') selalu throw error.
--          Plus, tabel accounts belum punya data default.
--
-- VERSI 3 (perbaikan dari 22P02 error):
--   - UUID pattern sebelumnya '50000000-0000-0000-0000-000000000003'
--     INVALID karena position 13 (group ke-3) adalah '0000' — version
--     UUID harus 1-5, bukan 0. PostgreSQL reject dengan 22P02.
--   - Fix: pakai UUID format valid (position 13 = '4' untuk v4, position 17
--     = 'a' untuk variant RFC 4122).
--   - Pattern: 'aaaaaaaa-4bbb-bccc-dddd-eeeeeeeeeeee' dimana:
--     a=1-9, b=any, c=any, d=8-b, e=any

BEGIN;

-- ============================================================
-- 0. Tambah UNIQUE constraint di account_mappings.transaction_type
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_mappings_transaction_type_key'
      AND conrelid = 'public.account_mappings'::regclass
  ) THEN
    DELETE FROM public.account_mappings a
    USING public.account_mappings b
    WHERE a.transaction_type = b.transaction_type
      AND a.ctid > b.ctid;

    ALTER TABLE public.account_mappings
      ADD CONSTRAINT account_mappings_transaction_type_key UNIQUE (transaction_type);
  END IF;
END $$;

-- ============================================================
-- 1. Seed Account Categories (UUID valid: position 13 = '4')
-- ============================================================
-- Pattern: '00000000-0000-4000-8000-000000000001' (version=4, variant=8)
INSERT INTO public.account_categories (id, name, type, description) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Kas & Bank', 'asset', 'Kas, bank, e-wallet'),
  ('11111111-1111-4111-8111-111111111102', 'Piutang', 'asset', 'Piutang customer'),
  ('11111111-1111-4111-8111-111111111103', 'Persediaan', 'asset', 'Stok material & produk'),
  ('11111111-1111-4111-8111-111111111104', 'Aktiva Tetap', 'asset', 'Peralatan, kendaraan, dll'),
  ('11111111-1111-4111-8111-111111111105', 'Hutang', 'liability', 'Hutang supplier, kredit bank'),
  ('11111111-1111-4111-8111-111111111106', 'Modal', 'equity', 'Modal pemilik'),
  ('11111111-1111-4111-8111-111111111107', 'Penjualan', 'revenue', 'Pendapatan dari penjualan'),
  ('11111111-1111-4111-8111-111111111108', 'HPP', 'expense', 'Harga Pokok Penjualan'),
  ('11111111-1111-4111-8111-111111111109', 'Beban Operasional', 'expense', 'Beban gaji, sewa, utilitas'),
  ('11111111-1111-4111-8111-111111111110', 'Beban Lain-lain', 'expense', 'Beban lain di luar operasional')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Seed Chart of Accounts (UUID valid: position 13 = '4')
-- ============================================================
-- Pattern by type:
--   Asset:     '22222222-2222-4222-8222-222222222201' to ...209
--   Liability: '33333333-3333-4333-8333-333333333301'
--   Equity:    '44444444-4444-4444-8444-444444444401' to ...402
--   Revenue:   '55555555-5555-4555-8555-555555555501' to ...502
--   Expense:   '66666666-6666-4666-8666-666666666601' to ...606
INSERT INTO public.accounts (id, code, name, type, category_id, is_cash_account, description) VALUES
  -- Assets
  ('22222222-2222-4222-8222-222222222201', '1101', 'Kas', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Kas tunai'),
  ('22222222-2222-4222-8222-222222222202', '1102', 'Bank BCA', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Rekening bank BCA'),
  ('22222222-2222-4222-8222-222222222203', '1103', 'Bank Mandiri', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Rekening bank Mandiri'),
  ('22222222-2222-4222-8222-222222222204', '1104', 'Xendit Cash', 'asset', '11111111-1111-4111-8111-111111111101', true, 'Saldo Xendit payment gateway'),
  ('22222222-2222-4222-8222-222222222205', '1201', 'Piutang Customer', 'asset', '11111111-1111-4111-8111-111111111102', false, 'Piutang dari customer'),
  ('22222222-2222-4222-8222-222222222206', '1301', 'Persediaan Bahan', 'asset', '11111111-1111-4111-8111-111111111103', false, 'Stok material/bahan di gudang'),
  ('22222222-2222-4222-8222-222222222207', '1302', 'Persediaan Barang Jadi', 'asset', '11111111-1111-4111-8111-111111111103', false, 'Stok produk jadi di toko'),
  ('22222222-2222-4222-8222-222222222208', '1401', 'Peralatan Toko', 'asset', '11111111-1111-4111-8111-111111111104', false, 'Peralatan operasional'),
  -- Liabilities
  ('33333333-3333-4333-8333-333333333301', '2101', 'Hutang Supplier', 'liability', '11111111-1111-4111-8111-111111111105', false, 'Hutang ke supplier'),
  -- Equity
  ('44444444-4444-4444-8444-444444444401', '3101', 'Modal Pemilik', 'equity', '11111111-1111-4111-8111-111111111106', false, 'Modal awal'),
  ('44444444-4444-4444-8444-444444444402', '3201', 'Laba Ditahan', 'equity', '11111111-1111-4111-8111-111111111106', false, 'Laba yang ditahan'),
  -- Revenue
  ('55555555-5555-4555-8555-555555555501', '4101', 'Penjualan Gorden', 'revenue', '11111111-1111-4111-8111-111111111107', false, 'Pendapatan dari penjualan gorden'),
  ('55555555-5555-4555-8555-555555555502', '4102', 'Penjualan Laundry', 'revenue', '11111111-1111-4111-8111-111111111107', false, 'Pendapatan dari laundry'),
  -- Expenses
  ('66666666-6666-4666-8666-666666666601', '5101', 'HPP Gorden', 'expense', '11111111-1111-4111-8111-111111111108', false, 'HPP material + upah penjahit'),
  ('66666666-6666-4666-8666-666666666602', '5102', 'HPP Laundry', 'expense', '11111111-1111-4111-8111-111111111108', false, 'HPP laundry'),
  ('66666666-6666-4666-8666-666666666603', '5201', 'Beban Gaji', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Beban gaji staff'),
  ('66666666-6666-4666-8666-666666666604', '5202', 'Beban Sewa', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Beban sewa tempat'),
  ('66666666-6666-4666-8666-666666666605', '5203', 'Beban Utilitas', 'expense', '11111111-1111-4111-8111-111111111109', false, 'Listrik, air, internet'),
  ('66666666-6666-4666-8666-666666666606', '5301', 'Beban Selisih Kurs', 'expense', '11111111-1111-4111-8111-111111111110', false, 'Beban selisih kurs (USD/IDR)')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Update account_mappings dengan valid account IDs
-- ============================================================
UPDATE public.account_mappings SET
  debit_account_id  = '22222222-2222-4222-8222-222222222205'::uuid,
  credit_account_id = '55555555-5555-4555-8555-555555555501'::uuid,
  description       = 'Order baru — Piutang (Debit) / Penjualan (Kredit)'
WHERE transaction_type = 'order_created';

UPDATE public.account_mappings SET
  debit_account_id  = '22222222-2222-4222-8222-222222222204'::uuid,
  credit_account_id = '22222222-2222-4222-8222-222222222205'::uuid,
  description       = 'Pembayaran diterima — Xendit (Debit) / Piutang (Kredit)'
WHERE transaction_type = 'payment_received';

UPDATE public.account_mappings SET
  debit_account_id  = '66666666-6666-4666-8666-666666666603'::uuid,
  credit_account_id = '22222222-2222-4222-8222-222222222201'::uuid,
  description       = 'Beban dibayar — Kas (Kredit) / Beban (Debit)'
WHERE transaction_type = 'expense_paid';

INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('purchase', '22222222-2222-4222-8222-222222222206'::uuid, '33333333-3333-4333-8333-333333333301'::uuid, 'PO received — Persediaan Bahan (Debit) / Hutang Supplier (Kredit)'),
  ('exchange_rate_diff', '66666666-6666-4666-8666-666666666606'::uuid, '66666666-6666-4666-8666-666666666606'::uuid, 'Selisih kurs — bisa debit atau credit (placeholder)')
ON CONFLICT (transaction_type) DO NOTHING;

COMMIT;

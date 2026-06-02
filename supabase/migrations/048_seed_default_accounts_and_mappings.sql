-- Migration 048: Seed default Chart of Accounts + populate account_mappings
-- Date: 2026-06-02
-- Reason: Migration 020 seed account_mappings dengan debit/credit_account_id = NULL,
--          sehingga createSimpleJournal('payment_received') selalu throw error.
--          Plus, tabel accounts belum punya data default.
--
-- VERSI 2 (perbaikan dari 42P10 error):
--   - account_mappings.transaction_type TIDAK PUNYA UNIQUE constraint,
--     sehingga 'ON CONFLICT (transaction_type)' gagal.
--   - Fix: tambah UNIQUE constraint di account_mappings.transaction_type
--     supaya ON CONFLICT bisa dipakai dengan benar.

BEGIN;

-- ============================================================
-- 0. Tambah UNIQUE constraint di account_mappings.transaction_type
--    (kalau belum ada). Hapus duplicates dulu kalau ada.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_mappings_transaction_type_key'
      AND conrelid = 'public.account_mappings'::regclass
  ) THEN
    -- Hapus duplicate rows (sisakan yang pertama berdasarkan created_at)
    DELETE FROM public.account_mappings a
    USING public.account_mappings b
    WHERE a.transaction_type = b.transaction_type
      AND a.ctid > b.ctid;

    -- Tambah UNIQUE constraint
    ALTER TABLE public.account_mappings
      ADD CONSTRAINT account_mappings_transaction_type_key UNIQUE (transaction_type);
  END IF;
END $$;

-- ============================================================
-- 1. Seed Account Categories
-- ============================================================
INSERT INTO public.account_categories (id, name, type, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Kas & Bank', 'asset', 'Kas, bank, e-wallet'),
  ('00000000-0000-0000-0000-000000000002', 'Piutang', 'asset', 'Piutang customer'),
  ('00000000-0000-0000-0000-000000000003', 'Persediaan', 'asset', 'Stok material & produk'),
  ('00000000-0000-0000-0000-000000000004', 'Aktiva Tetap', 'asset', 'Peralatan, kendaraan, dll'),
  ('00000000-0000-0000-0000-000000000005', 'Hutang', 'liability', 'Hutang supplier, kredit bank'),
  ('00000000-0000-0000-0000-000000000006', 'Modal', 'equity', 'Modal pemilik'),
  ('00000000-0000-0000-0000-000000000007', 'Penjualan', 'revenue', 'Pendapatan dari penjualan'),
  ('00000000-0000-0000-0000-000000000008', 'HPP', 'expense', 'Harga Pokok Penjualan'),
  ('00000000-0000-0000-0000-000000000009', 'Beban Operasional', 'expense', 'Beban gaji, sewa, utilitas'),
  ('00000000-0000-0000-0000-000000000010', 'Beban Lain-lain', 'expense', 'Beban lain di luar operasional')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Seed Chart of Accounts (with fixed UUIDs for referential integrity)
-- ============================================================
INSERT INTO public.accounts (id, code, name, type, category_id, is_cash_account, description) VALUES
  -- Assets
  ('10000000-0000-0000-0000-000000000001', '1101', 'Kas', 'asset', '00000000-0000-0000-0000-000000000001', true, 'Kas tunai'),
  ('10000000-0000-0000-0000-000000000002', '1102', 'Bank BCA', 'asset', '00000000-0000-0000-0000-000000000001', true, 'Rekening bank BCA'),
  ('10000000-0000-0000-0000-000000000003', '1103', 'Bank Mandiri', 'asset', '00000000-0000-0000-0000-000000000001', true, 'Rekening bank Mandiri'),
  ('10000000-0000-0000-0000-000000000004', '1104', 'Xendit Cash', 'asset', '00000000-0000-0000-0000-000000000001', true, 'Saldo Xendit payment gateway'),
  ('10000000-0000-0000-0000-000000000005', '1201', 'Piutang Customer', 'asset', '00000000-0000-0000-0000-000000000002', false, 'Piutang dari customer'),
  ('10000000-0000-0000-0000-000000000006', '1301', 'Persediaan Bahan', 'asset', '00000000-0000-0000-0000-000000000003', false, 'Stok material/bahan di gudang'),
  ('10000000-0000-0000-0000-000000000007', '1302', 'Persediaan Barang Jadi', 'asset', '00000000-0000-0000-0000-000000000003', false, 'Stok produk jadi di toko'),
  ('10000000-0000-0000-0000-000000000008', '1401', 'Peralatan Toko', 'asset', '00000000-0000-0000-0000-000000000004', false, 'Peralatan operasional'),
  -- Liabilities
  ('20000000-0000-0000-0000-000000000001', '2101', 'Hutang Supplier', 'liability', '00000000-0000-0000-0000-000000000005', false, 'Hutang ke supplier'),
  -- Equity
  ('30000000-0000-0000-0000-000000000001', '3101', 'Modal Pemilik', 'equity', '00000000-0000-0000-0000-000000000006', false, 'Modal awal'),
  ('30000000-0000-0000-0000-000000000002', '3201', 'Laba Ditahan', 'equity', '00000000-0000-0000-0000-000000000006', false, 'Laba yang ditahan'),
  -- Revenue
  ('40000000-0000-0000-0000-000000000001', '4101', 'Penjualan Gorden', 'revenue', '00000000-0000-0000-0000-000000000007', false, 'Pendapatan dari penjualan gorden'),
  ('40000000-0000-0000-0000-000000000002', '4102', 'Penjualan Laundry', 'revenue', '00000000-0000-0000-0000-000000000007', false, 'Pendapatan dari laundry'),
  -- Expenses
  ('50000000-0000-0000-0000-000000000001', '5101', 'HPP Gorden', 'expense', '00000000-0000-0000-0000-000000000008', false, 'HPP material + upah penjahit'),
  ('50000000-0000-0000-0000-000000000002', '5102', 'HPP Laundry', 'expense', '00000000-0000-0000-0000-000000000008', false, 'HPP laundry'),
  ('50000000-0000-0000-0000-0000-000000000003', '5201', 'Beban Gaji', 'expense', '00000000-0000-0000-0000-000000000009', false, 'Beban gaji staff'),
  ('50000000-0000-0000-0000-0000-000000000004', '5202', 'Beban Sewa', 'expense', '00000000-0000-0000-0000-000000000009', false, 'Beban sewa tempat'),
  ('50000000-0000-0000-0000-000000000005', '5203', 'Beban Utilitas', 'expense', '00000000-0000-0000-0000-000000000009', false, 'Listrik, air, internet'),
  ('50000000-0000-0000-0000-000000000006', '5301', 'Beban Selisih Kurs', 'expense', '00000000-0000-0000-0000-000000000010', false, 'Beban selisih kurs (USD/IDR)')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Update account_mappings dengan valid account IDs
-- ============================================================
UPDATE public.account_mappings SET
  debit_account_id  = '10000000-0000-0000-0000-000000000005'::uuid,
  credit_account_id = '40000000-0000-0000-0000-000000000001'::uuid,
  description       = 'Order baru — Piutang (Debit) / Penjualan (Kredit)'
WHERE transaction_type = 'order_created';

UPDATE public.account_mappings SET
  debit_account_id  = '10000000-0000-0000-0000-000000000004'::uuid,
  credit_account_id = '10000000-0000-0000-0000-000000000005'::uuid,
  description       = 'Pembayaran diterima — Xendit (Debit) / Piutang (Kredit)'
WHERE transaction_type = 'payment_received';

UPDATE public.account_mappings SET
  debit_account_id  = '50000000-0000-0000-0000-000000000003'::uuid,
  credit_account_id = '10000000-0000-0000-0000-000000000001'::uuid,
  description       = 'Beban dibayar — Kas (Kredit) / Beban (Debit)'
WHERE transaction_type = 'expense_paid';

-- Insert new mappings (sekarang ON CONFLICT(transaction_type) works
-- karena kita sudah tambah UNIQUE constraint di step 0)
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('purchase', '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'PO received — Persediaan Bahan (Debit) / Hutang Supplier (Kredit)'),
  ('exchange_rate_diff', '50000000-0000-0000-0000-000000000006'::uuid, '50000000-0000-0000-0000-000000000006'::uuid, 'Selisih kurs — bisa debit atau credit (placeholder)')
ON CONFLICT (transaction_type) DO NOTHING;

COMMIT;

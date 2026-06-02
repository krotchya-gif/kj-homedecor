-- Migration 049: Insert 3 account_mappings yang hilang dari migration 048
-- Date: 2026-06-02
-- Reason: Migration 048 v4 cleanup (DELETE) + UPDATE WHERE pattern
--          gagal untuk 3 transaction_types — setelah DELETE, rows untuk
--          'order_created', 'payment_received', 'expense_paid' sudah hilang,
--          jadi UPDATE tidak affect apa-apa. Hasilnya hanya 'purchase' dan
--          'exchange_rate_diff' yang masuk (via INSERT).
--
-- Akibat: createSimpleJournal('payment_received') throw 'No mapping' — Journal
-- entry gagal dibuat.
--
-- Fix: INSERT 3 rows yang hilang. Idempotent — pakai ON CONFLICT (transaction_type).

BEGIN;

-- Insert 3 transaction_types yang hilang
INSERT INTO public.account_mappings (transaction_type, debit_account_id, credit_account_id, description) VALUES
  ('order_created',
   '22222222-2222-4222-8222-222222222205'::uuid,  -- Piutang Customer
   '55555555-5555-4555-8555-555555555501'::uuid,  -- Penjualan Gorden
   'Order baru — Piutang (Debit) / Penjualan (Kredit)'),
  ('payment_received',
   '22222222-2222-4222-8222-222222222204'::uuid,  -- Xendit Cash
   '22222222-2222-4222-8222-222222222205'::uuid,  -- Piutang Customer
   'Pembayaran diterima — Xendit (Debit) / Piutang (Kredit)'),
  ('expense_paid',
   '66666666-6666-4666-8666-666666666603'::uuid,  -- Beban Gaji
   '22222222-2222-4222-8222-222222222201'::uuid,  -- Kas
   'Beban dibayar — Kas (Kredit) / Beban (Debit)')
ON CONFLICT (transaction_type) DO UPDATE SET
  debit_account_id  = EXCLUDED.debit_account_id,
  credit_account_id = EXCLUDED.credit_account_id,
  description       = EXCLUDED.description,
  is_active         = true;

COMMIT;

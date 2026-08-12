-- ============================================================
-- 077 — E Wallet Tiktok + Xendit removal + BUG-061
-- ============================================================
-- Keputusan owner (2026-08-13):
--   - Xendit / payment gateway TIDAK dipakai lagi → akun COA 1104
--     "Xendit Cash" di-rename menjadi "E Wallet Tiktok" (riwayat saldo
--     nyambung, karena TikTok selama ini settlement-nya memang masuk ke situ).
--   - Tambah row cash_accounts untuk 1104 agar create_journal_atomic
--     melacak saldo E-Wallet (live sebelumnya TIDAK punya row ini).
--   - Default mapping offline diarahkan ke Kas (1101): payment_received &
--     sales_return — uang tunai/manual tidak boleh default ke E-Wallet.
--   - BUG-061: orders.scheduled_installation_time (TIME) — kolom dipakai
--     kode (jadwal pasang) tapi belum ada di live (42703 silent).
-- Idempotent: guard / ON CONFLICT / IF NOT EXISTS.
-- ============================================================

-- 1) Rename akun 1104 → E Wallet Tiktok
UPDATE public.accounts
SET name = 'E Wallet Tiktok'
WHERE id = '22222222-2222-4222-8222-222222222204'
  AND name <> 'E Wallet Tiktok';

-- 2) Row cash_accounts untuk tracking saldo E-Wallet (create_journal_atomic
--    meng-update cash_accounts.balance untuk baris jurnal yang account_id-nya
--    cocok dengan cash_accounts.account_id).
INSERT INTO public.cash_accounts (account_id, bank_name, account_number, is_active)
SELECT '22222222-2222-4222-8222-222222222204', 'E Wallet Tiktok', '', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.cash_accounts
  WHERE account_id = '22222222-2222-4222-8222-222222222204'
);

-- 3) Default mapping offline → Kas (1101), bukan E-Wallet/Xendit
UPDATE public.account_mappings
SET debit_account_id = '22222222-2222-4222-8222-222222222201'  -- Kas
WHERE transaction_type = 'payment_received'
  AND debit_account_id = '22222222-2222-4222-8222-222222222204';

UPDATE public.account_mappings
SET credit_account_id = '22222222-2222-4222-8222-222222222201'  -- Kas
WHERE transaction_type = 'sales_return'
  AND credit_account_id = '22222222-2222-4222-8222-222222222204';

-- 4) BUG-061: kolom jadwal pasang (waktu) yang dipakai kode tapi tidak ada di live
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scheduled_installation_time TIME;

NOTIFY pgrst, 'reload schema';

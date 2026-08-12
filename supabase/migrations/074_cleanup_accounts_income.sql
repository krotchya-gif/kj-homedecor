-- ============================================================
-- 074 — Cleanup accounts: type 'income' -> 'revenue' + VALIDATE constraint
-- ============================================================
-- 2 akun (4101 Penjualan Gorden, 4102 Penjualan Laundry) memakai type 'income'
-- (bukan 'revenue') — di luar daftar CHECK 067 yang NOT VALID.
-- Perbaiki lalu VALIDATE constraint agar data lama tidak lolos lagi.
-- Idempotent.
-- ============================================================

UPDATE public.accounts SET type = 'revenue' WHERE type = 'income';

ALTER TABLE public.accounts VALIDATE CONSTRAINT accounts_type_check;

NOTIFY pgrst, 'reload schema';

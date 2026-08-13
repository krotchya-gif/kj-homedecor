-- ============================================================
-- 080 — Bersihkan sisa Xendit + fix payments_type_check (refund)
-- ============================================================
-- Latar (sesi 15, 2026-08-13):
--   1. Kolom payments.xendit_id / external_payment_method / xendit_payment_id
--      adalah sisa legacy migration 043 — Xendit sudah dihapus (route API + env
--      + akun 1104 → E Wallet Tiktok, sesi 9). Kolom tidak dipakai kode & 0 data
--      → DROP biar bersih.
--   2. Constraint live payments_type_check = ('dp','lunas') TANPA 'refund' padahal
--      kode (finance/payments handleRefund) insert type='refund' → fitur refund
--      SELALU gagal 23514. Drop + recreate dengan ('dp','lunas','refund') selaras
--      file & kode.
-- Idempotent.
-- ============================================================

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS xendit_id,
  DROP COLUMN IF EXISTS external_payment_method,
  DROP COLUMN IF EXISTS xendit_payment_id;

DROP INDEX IF EXISTS idx_payments_xendit_id;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_type_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('dp','lunas','refund'));

NOTIFY pgrst, 'reload schema';

-- Migration 043: Add xendit_payment_id column to payments for idempotency
-- Date: 2026-06-02
-- Reason: Xendit webhook can retry — need unique dedup key per payment to prevent
--          double-charging and double-recording lunas_amount.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS xendit_payment_id TEXT;

-- Partial unique index: only enforce uniqueness on non-null values
-- (existing rows have NULL, future Xendit payments will have unique IDs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_xendit_id
  ON public.payments(xendit_payment_id)
  WHERE xendit_payment_id IS NOT NULL;

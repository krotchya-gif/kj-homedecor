-- ============================================================
-- 076 — Unique invoice_number piutang (semua channel)
-- ============================================================
-- Anti-double faktur: satu nomor invoice = satu piutang (sebelumnya hanya
-- untuk channel tiktok via piutang_tiktok_invoice_unique).
-- Diverifikasi live: tidak ada duplikat invoice_number saat ini.
-- Idempotent.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS piutang_invoice_unique
  ON public.piutang (invoice_number)
  WHERE invoice_number IS NOT NULL;

NOTIFY pgrst, 'reload schema';

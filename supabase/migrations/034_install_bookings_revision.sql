-- ============================================================
-- Add revision fields to install_bookings
-- Supports the Installer Revisi & Return Flow:
-- - Installer reports a problem at location
-- - Booking marked with revision status + reason + photos
-- ============================================================

ALTER TABLE public.install_bookings
  ADD COLUMN IF NOT EXISTS revision_reason TEXT,
  ADD COLUMN IF NOT EXISTS revision_photos TEXT[]; -- array of photo URLs

-- Index for quick lookup of revision bookings by gudang
CREATE INDEX IF NOT EXISTS idx_ib_revision_status
  ON public.install_bookings(status)
  WHERE status = 'revision';

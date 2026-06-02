-- Migration 045: Extend order_logs.action CHECK constraint
-- Date: 2026-06-02
-- Reason: Codebase uses 11+ action values that are NOT in the existing whitelist
--          (from migration 030). Every INSERT to order_logs with these actions
--          returns HTTP 400 Bad Request, blocking critical pipeline features:
--          - Penjahit assignment (production page)
--          - Steam QC pass logging
--          - Steam revision re-queue (API)
--          - Order deletion audit (API)
--          - Payment input/added (admin/finance)
--          - Refund issued (finance)
--          - Installation lifecycle (installer)
--
-- Without this migration, the entire pipeline audit trail is broken.

-- Drop and recreate with extended whitelist
ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS chk_action;
ALTER TABLE public.order_logs ADD CONSTRAINT chk_action
  CHECK (action IN (
    -- Original (from migration 030)
    'created','sorted','payment_approved','production_started','production_done',
    'qc_pass','qc_fail','ready','packed','shipped','installed','done',
    'return_initiated','return_stock_in','return_disposed','cancelled',
    -- New actions (2026-06-02 — Pipeline V2 + critical bug fixes)
    'penjahit_assigned',          -- Gudang assigns penjahit
    'install_started',            -- Installer starts work
    'install_done',               -- Installer completes work
    'install_revision',           -- Installer reports issue
    'steam_qc_pass',              -- Steam QC passed
    'steam_revision_requeue',     -- Steam QC fail -> re-queue
    'order_deleted',              -- Admin/Owner deletes order
    'payment_input',              -- Finance input payment
    'payment_added',              -- Admin adds payment
    'refund_issued'               -- Finance issues refund
  ));

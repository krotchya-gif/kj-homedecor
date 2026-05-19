-- Migration 030: Update order_logs CHECK constraint with additional actions
-- Add return-related actions that are used in the codebase but not in the constraint

ALTER TABLE public.order_logs DROP CONSTRAINT IF EXISTS chk_action;
ALTER TABLE public.order_logs ADD CONSTRAINT chk_action
  CHECK (action IN (
    'created','sorted','payment_approved','production_started','production_done',
    'qc_pass','qc_fail','ready','packed','shipped','installed','done',
    'return_initiated','return_stock_in','return_disposed','cancelled'
  ));
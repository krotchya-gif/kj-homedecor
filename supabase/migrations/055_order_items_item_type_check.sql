-- Migration 055: Add CHECK constraint for order_items.item_type
-- Fixes High #8
--
-- Migration 014 added item_type column as TEXT with no CHECK constraint.
-- This migration adds a check to enforce valid item_type values.

BEGIN;

-- First, clean up any existing invalid values by setting them to 'gorden'
UPDATE public.order_items
SET item_type = 'gorden'
WHERE item_type IS NULL
   OR item_type NOT IN ('gorden', 'perabot', 'laundry');

-- Add CHECK constraint
ALTER TABLE public.order_items ADD CONSTRAINT chk_item_type
  CHECK (item_type IN ('gorden', 'perabot', 'laundry'));

-- Add a NOT NULL default as safety net (column already has DEFAULT 'gorden' from 014)
ALTER TABLE public.order_items ALTER COLUMN item_type SET DEFAULT 'gorden';

COMMIT;

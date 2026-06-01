-- Migration 039: Add product_id to inventory_movements (idempotent)
-- The QC page's handleReturResolve inserts product_id into inventory_movements
-- This adds the missing column if it doesn't exist yet.

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- Index only if not exists
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);

-- RLS already exists for inventory_movements (migration 001)
-- Grant access to gudang role
GRANT USAGE ON SCHEMA public TO gudang;
GRANT ALL ON inventory_movements TO gudang;

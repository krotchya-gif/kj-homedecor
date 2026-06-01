-- Migration 039: Add product_id to inventory_movements
-- The QC page's handleReturResolve inserts product_id into inventory_movements
-- but the table only had material_id. This adds the missing column.

ALTER TABLE inventory_movements ADD COLUMN product_id UUID REFERENCES products(id);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements(product_id);

-- RLS already exists for inventory_movements (migration 001)
-- Grant access to gudang role
GRANT USAGE ON SCHEMA public TO gudang;
GRANT ALL ON inventory_movements TO gudang;
-- Migration 028: Fix inventory_movements for product returns
-- Problem: inventory_movements has material_id NOT NULL but return flow deals with products (finished goods)
-- Solution: Add product_id column to track finished product movements

-- 1. Add product_id column (nullable, for finished product movements)
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);

-- 2. Drop NOT NULL from material_id (now nullable since return_in/dispose uses product_id)
ALTER TABLE public.inventory_movements ALTER COLUMN material_id DROP NOT NULL;

-- 3. Add index for product_id lookups
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);

-- 4. Add composite index for return tracking
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON public.inventory_movements(id);
-- Migration 044: Fix stock RPC functions to accept NUMERIC (was INTEGER)
-- Date: 2026-06-02
-- Reason: BOM consumption passes qty_per_unit × item.qty which can be decimal
--          (e.g. 2.5m). INTEGER type causes runtime error → fallback to direct
--          UPDATE without GREATEST(0) guard → stock can go negative.

-- Recreate with NUMERIC type to match the rest of the schema
CREATE OR REPLACE FUNCTION decrement_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE materials
  SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - amount, 0)
  WHERE id = material_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock_gudang(material_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE materials
  SET stock_gudang = COALESCE(stock_gudang, 0) + amount
  WHERE id = material_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock_toko(product_id UUID, amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock_toko = COALESCE(stock_toko, 0) + amount
  WHERE id = product_id;
END;
$$;

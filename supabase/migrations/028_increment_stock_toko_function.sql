-- Migration 028: Create stock management RPC functions
-- Called from: admin/orders/[id]/page.tsx, gudang/qc/page.tsx, gudang/production/page.tsx

-- Function to increment stock_toko on products
CREATE OR REPLACE FUNCTION increment_stock_toko(product_id UUID, amount INTEGER)
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

-- Function to decrement stock_gudang on materials (BOM consumption)
CREATE OR REPLACE FUNCTION decrement_stock_gudang(material_id UUID, amount INTEGER)
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

-- Function to increment stock_gudang on materials (PO received)
CREATE OR REPLACE FUNCTION increment_stock_gudang(material_id UUID, amount INTEGER)
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
-- Migration: 015_order_number
-- Desc: Add sequential order_number for invoice/faktur pajak + generate_order_number function
-- Date: 2026-05-10

-- Add order_number column to orders table
ALTER TABLE orders ADD COLUMN order_number TEXT UNIQUE;

-- Create function to generate sequential order number per year
-- Format: ORD-YYYY-NNNN (e.g., ORD-2026-0001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(CAST(COALESCE(
      (SELECT MAX(SUBSTRING(order_number FROM 'ORD-\d{4}-(\d+)$')::int)
       FROM orders WHERE order_number LIKE 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-%'),
      0) + 1 AS TEXT), 4, '0');
$$ LANGUAGE SQL;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_number_year ON orders(WHERE order_number IS NOT NULL);
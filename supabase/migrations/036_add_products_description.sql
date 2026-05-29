-- Add description column to products table for product catalog descriptions
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN products.description IS 'Product description for catalog display';

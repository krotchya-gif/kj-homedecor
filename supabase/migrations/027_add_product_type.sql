-- Add product_type column to differentiate Gorden vs Perabot
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'perabot';

-- Update existing products based on category
-- Gorden categories: gorden, vitras, roman, kupu-kupu
UPDATE products SET product_type = 'gorden'
WHERE category_id IN (
  SELECT id FROM categories WHERE slug IN ('gorden', 'vitras', 'roman', 'kupu-kupu')
);

-- Perabot categories: kait-aksesoris, custom, and others default to perabot
UPDATE products SET product_type = 'perabot'
WHERE product_type IS NULL OR product_type = 'perabot';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
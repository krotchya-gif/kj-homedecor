-- 012_style_shipping_variants.sql
-- Add style variants, color variants, and shipping dimensions to products
-- Modify order_items to use unified meter + style checkboxes

-- Products table: add variants and dimensions
ALTER TABLE products ADD COLUMN IF NOT EXISTS style_variants TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS smokring_colors TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_variants TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_p NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_l NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimension_t NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- Order items table: add unified meter, style_type, variants, and dimensions
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS meter NUMERIC DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS style_type TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS smokring_color TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_color TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_size TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS dimension_p NUMERIC;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS dimension_l NUMERIC;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS dimension_t NUMERIC;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- Insert default smokring colors if not exists
-- (will be used as default options in UI)

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_products_style_variants ON products USING GIN(style_variants);
CREATE INDEX IF NOT EXISTS idx_products_color_variants ON products USING GIN(color_variants);
CREATE INDEX IF NOT EXISTS idx_order_items_style_type ON order_items(style_type);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_color ON order_items(variant_color);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_size ON order_items(variant_size);
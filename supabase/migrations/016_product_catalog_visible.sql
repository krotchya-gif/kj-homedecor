-- Add visibility flag to separate catalog products from internal-only products
ALTER TABLE products ADD COLUMN is_catalog_visible boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.is_catalog_visible IS 'true = visible on landing page catalog; false = internal/admin only';
-- Add hero_image_url to landing_settings table
ALTER TABLE landing_settings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

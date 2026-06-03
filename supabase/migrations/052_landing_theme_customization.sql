-- Migration 052: Landing Page Theme Customization
-- Add theme customization columns to landing_settings table
-- Allows admin to customize colors, presets, and styling via dashboard

-- Add theme color columns
ALTER TABLE landing_settings
ADD COLUMN IF NOT EXISTS theme_primary_color TEXT DEFAULT '#DDC0B4',
ADD COLUMN IF NOT EXISTS theme_secondary_color TEXT DEFAULT '#C9A98C',
ADD COLUMN IF NOT EXISTS theme_accent_color TEXT DEFAULT '#f4a857',
ADD COLUMN IF NOT EXISTS theme_background_color TEXT DEFAULT '#FAF5EE',
ADD COLUMN IF NOT EXISTS theme_text_color TEXT DEFAULT '#2B2321';

-- Add theme preset column
ALTER TABLE landing_settings
ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'default';

-- Add hero background customization
ALTER TABLE landing_settings
ADD COLUMN IF NOT EXISTS hero_background_image TEXT,
ADD COLUMN IF NOT EXISTS hero_background_overlay_opacity NUMERIC DEFAULT 0.75;

-- Add advanced styling options
ALTER TABLE landing_settings
ADD COLUMN IF NOT EXISTS theme_border_radius TEXT DEFAULT '0.5rem',
ADD COLUMN IF NOT EXISTS theme_font_heading TEXT DEFAULT 'Playfair Display',
ADD COLUMN IF NOT EXISTS theme_font_body TEXT DEFAULT 'Inter';

-- Add CHECK constraint for theme_preset
ALTER TABLE landing_settings
ADD CONSTRAINT landing_settings_theme_preset_check 
CHECK (theme_preset IN ('default', 'modern', 'gold', 'green', 'purple', 'custom'));

-- Add CHECK constraint for overlay opacity (0-1 range)
ALTER TABLE landing_settings
ADD CONSTRAINT landing_settings_overlay_opacity_check 
CHECK (hero_background_overlay_opacity >= 0 AND hero_background_overlay_opacity <= 1);

-- Comment on new columns
COMMENT ON COLUMN landing_settings.theme_primary_color IS 'Primary brand color (HEX format)';
COMMENT ON COLUMN landing_settings.theme_secondary_color IS 'Secondary brand color (HEX format)';
COMMENT ON COLUMN landing_settings.theme_accent_color IS 'Accent/highlight color (HEX format)';
COMMENT ON COLUMN landing_settings.theme_background_color IS 'Page background color (HEX format)';
COMMENT ON COLUMN landing_settings.theme_text_color IS 'Primary text color (HEX format)';
COMMENT ON COLUMN landing_settings.theme_preset IS 'Theme preset: default, modern, gold, green, purple, custom';
COMMENT ON COLUMN landing_settings.hero_background_image IS 'Optional hero background image URL (overrides gradient)';
COMMENT ON COLUMN landing_settings.hero_background_overlay_opacity IS 'Hero overlay opacity (0-1)';
COMMENT ON COLUMN landing_settings.theme_border_radius IS 'Global border radius (CSS value)';
COMMENT ON COLUMN landing_settings.theme_font_heading IS 'Heading font family';
COMMENT ON COLUMN landing_settings.theme_font_body IS 'Body font family';

-- Update existing row with default theme values (if exists)
UPDATE landing_settings
SET 
  theme_primary_color = '#DDC0B4',
  theme_secondary_color = '#C9A98C',
  theme_accent_color = '#f4a857',
  theme_background_color = '#FAF5EE',
  theme_text_color = '#2B2321',
  theme_preset = 'default',
  hero_background_overlay_opacity = 0.75,
  theme_border_radius = '0.5rem',
  theme_font_heading = 'Playfair Display',
  theme_font_body = 'Inter'
WHERE id = 'hero';

-- Made with Bob

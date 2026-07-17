-- Add landing page section text fields to landing_settings
-- Categories section
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS categories_label TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS categories_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS categories_subtitle TEXT;

-- Why Us section
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_label TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_subtitle TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card1_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card1_desc TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card2_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card2_desc TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card3_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card3_desc TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card4_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS whyus_card4_desc TEXT;

-- Portfolio section
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS portfolio_label TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS portfolio_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS portfolio_subtitle TEXT;

-- CTA Banner section
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS cta_badge TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE landing_settings ADD COLUMN IF NOT EXISTS cta_subtitle TEXT;
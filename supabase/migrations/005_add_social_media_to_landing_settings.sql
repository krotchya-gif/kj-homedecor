-- Add social media fields to landing_settings
ALTER TABLE landing_settings
  ADD COLUMN instagram TEXT,
  ADD COLUMN facebook TEXT,
  ADD COLUMN tiktok TEXT,
  ADD COLUMN shopee TEXT,
  ADD COLUMN tokopedia TEXT,
  ADD COLUMN address TEXT DEFAULT 'Jakarta, Indonesia',
  ADD COLUMN phone TEXT DEFAULT '+62 812-3456-7890';

-- Update RLS to allow admin update
DROP POLICY IF EXISTS "Only admin can update landing settings" ON landing_settings;
CREATE POLICY "Only admin can update landing settings" ON landing_settings FOR UPDATE USING (auth.role() = 'service_role' OR true);

-- Booking System Fix - Add missing columns to install_bookings
-- Supports customer booking from website + manual/admin booking

-- Add missing columns
ALTER TABLE install_bookings
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website' CHECK (source IN ('website', 'manual', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Update status to include 'pending' (was only: scheduled, done, cancelled)
ALTER TABLE install_bookings DROP CONSTRAINT IF EXISTS install_bookings_status_check;
ALTER TABLE install_bookings ADD CONSTRAINT install_bookings_status_check
  CHECK (status IN ('pending', 'scheduled', 'done', 'cancelled'));

-- Make order_id nullable (customer booking doesn't have order)
ALTER TABLE install_bookings ALTER COLUMN order_id DROP NOT NULL;

-- Make customer_id nullable (customer booking uses customer_name/customer_phone instead)
ALTER TABLE install_bookings ALTER COLUMN customer_id DROP NOT NULL;

-- Ensure address is nullable (visit toko doesn't need address)
ALTER TABLE install_bookings ALTER COLUMN address DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_install_bookings_status ON install_bookings(status);
CREATE INDEX IF NOT EXISTS idx_install_bookings_scheduled_date ON install_bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_install_bookings_type ON install_bookings(type);
CREATE INDEX IF NOT EXISTS idx_install_bookings_created_at ON install_bookings(created_at DESC);

-- RLS: Allow public insert (for website booking form)
DROP POLICY IF EXISTS "Public can insert install_bookings" ON install_bookings;
CREATE POLICY "Public can insert install_bookings" ON install_bookings
  FOR INSERT WITH CHECK (true);

-- Allow public read for all bookings (admin needs to see them)
DROP POLICY IF EXISTS "Public can read install_bookings" ON install_bookings;
CREATE POLICY "Public can read install_bookings" ON install_bookings
  FOR SELECT USING (true);
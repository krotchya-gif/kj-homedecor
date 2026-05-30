-- 038_enable_rls_order_progress_photos.sql
-- Enable RLS on order_progress_photos table (missing since migration 032)

ALTER TABLE public.order_progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff access" ON public.order_progress_photos
  FOR ALL USING (auth.role() = 'authenticated');
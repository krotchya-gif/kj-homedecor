-- Fix drift: check constraint laundry_orders_status_check di live menolak 'in_progress'
-- (live: pending, done, cancelled — tanpa in_progress), padahal kode memakai alur
-- pending -> in_progress -> done. Union nilai yang aman agar data lama tetap valid.
ALTER TABLE public.laundry_orders
  DROP CONSTRAINT IF EXISTS laundry_orders_status_check;

ALTER TABLE public.laundry_orders
  ADD CONSTRAINT laundry_orders_status_check
  CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled'));

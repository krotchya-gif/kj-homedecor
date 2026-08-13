-- BUG-116 (2026-08-13): laundry_orders.order_id dipakai codebase (insert item laundry di order detail)
-- & TS type (LaundryOrder.order_id), tapi kolom tidak ada di live (hanya item/qty/price/notes).
-- Tanpa kolom ini, tambah item laundry di order detail PASTI gagal 42703.
ALTER TABLE public.laundry_orders ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_laundry_orders_order_id ON public.laundry_orders(order_id);

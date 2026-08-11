-- 056_add_orders_updated_at.sql
-- Temuan QA menyeluruh 2026-08-01: halaman /admin/shipping 400
--   orders?select=*,customer:customers(name,phone)&classification=eq.kirim&status=in.(ready,packed,shipped)&order=updated_at.desc
-- Root cause: kolom orders.updated_at TIDAK PERNAH dibuat (migration 001 hanya
--   memberi updated_at ke bom & portfolio_posts; tidak ada migration yang menambah ke orders).
--   Kode shipping page sudah benar (.order('updated_at')), DB yang kurang.
-- Fix: tambah kolom + trigger auto-update (idempotent).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- backfill dari created_at (data lama)
UPDATE public.orders SET updated_at = COALESCE(updated_at, created_at) WHERE updated_at IS NULL;

-- trigger supaya update otomatis setiap perubahan baris
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

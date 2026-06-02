-- Migration 051: Pipeline V3 — Branching (kirim vs pasang) + Material RPC Refactor
-- Date: 2026-06-02
-- Plan: Pipeline V3 (Amendment 2 di zesty-jingling-aurora.md)
--
-- Goals:
-- 1. Extend orders.status enum: tambah 'scheduled', 'installing' (untuk alur pasang)
-- 2. Add FK traceability ke inventory_movements: order_id, production_job_id
-- 3. New table: order_material_consumption (per-order material snapshot)
-- 4. New RPC: consume_materials_for_production (atomic stock decrement + audit)
-- 5. New RPC: advance_install_booking_status (cascade booking -> orders.status)
-- 6. Backfill: auto-create install_bookings untuk existing 'pasang' orders di 'packed'

BEGIN;

-- ============================================================
-- 1. Extend orders.status CHECK constraint
--    Tambah: 'scheduled' (setelah assign installer), 'installing' (sedang dipasang)
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_order_status
  CHECK (status IN ('new','sorted','production','steam','ready','payment_ok',
                  'packed','shipped','scheduled','installing','done',
                  'returned','cancelled'));

-- ============================================================
-- 2. Add FK traceability columns ke inventory_movements
--    material_id sudah nullable (per migration 029)
-- ============================================================
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS production_job_id UUID REFERENCES public.production_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id
  ON public.inventory_movements(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_production_job_id
  ON public.inventory_movements(production_job_id) WHERE production_job_id IS NOT NULL;

-- Extend type CHECK constraint untuk include 'adjustment' (untuk material consumption)
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_type_check
  CHECK (type IN ('in','out','transfer_in','transfer_out','return_in','dispose','adjustment'));

-- ============================================================
-- 3. New table: order_material_consumption
--    Snapshot material consumption PER ORDER (untuk HPP calculation & traceability)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_material_consumption (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  production_job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES public.materials(id),
  qty_consumed      NUMERIC NOT NULL,
  consumed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_by       UUID REFERENCES public.users(id),
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_omc_order_id
  ON public.order_material_consumption(order_id);
CREATE INDEX IF NOT EXISTS idx_omc_production_job_id
  ON public.order_material_consumption(production_job_id);
CREATE INDEX IF NOT EXISTS idx_omc_material_id
  ON public.order_material_consumption(material_id);
-- Unique constraint: 1 material per production_job (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_omc_job_material_unique
  ON public.order_material_consumption(production_job_id, material_id);

-- ============================================================
-- 4. New RPC: consume_materials_for_production
--    Atomic: decrement stock + insert consumption + insert inventory_movements
--    Dipanggil dari API saat production_jobs.status -> 'done'
-- ============================================================
CREATE OR REPLACE FUNCTION consume_materials_for_production(
  p_production_job_id UUID,
  p_order_id UUID,
  p_consumed_by UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_bom RECORD;
  v_qty NUMERIC;
  v_existing_id UUID;
  v_consumption_count INTEGER := 0;
  v_total_qty NUMERIC := 0;
BEGIN
  -- Validate production_job_id exists
  IF NOT EXISTS (SELECT 1 FROM production_jobs WHERE id = p_production_job_id) THEN
    RAISE EXCEPTION 'production_job_id % tidak ditemukan', p_production_job_id;
  END IF;

  -- Idempotency: cek apakah sudah pernah di-consume
  SELECT id INTO v_existing_id
  FROM order_material_consumption
  WHERE production_job_id = p_production_job_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Sudah pernah di-consume, return info
    SELECT COUNT(*), COALESCE(SUM(qty_consumed), 0)
      INTO v_consumption_count, v_total_qty
    FROM order_material_consumption
    WHERE production_job_id = p_production_job_id;

    RETURN jsonb_build_object(
      'already_consumed', true,
      'consumption_count', v_consumption_count,
      'total_qty', v_total_qty
    );
  END IF;

  -- Iterate order_items, lookup BOM, decrement stock
  FOR v_item IN
    SELECT product_id, qty
    FROM order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    FOR v_bom IN
      SELECT material_id, qty_per_unit
      FROM bom
      WHERE product_id = v_item.product_id
    LOOP
      v_qty := COALESCE(v_bom.qty_per_unit, 0) * COALESCE(v_item.qty, 0);

      IF v_qty <= 0 THEN
        CONTINUE;
      END IF;

      -- 1. Decrement stock (dengan GREATEST(0) guard)
      UPDATE materials
      SET stock_gudang = GREATEST(COALESCE(stock_gudang, 0) - v_qty, 0)
      WHERE id = v_bom.material_id;

      -- 2. Insert consumption record (per-order traceability)
      INSERT INTO order_material_consumption
        (order_id, production_job_id, material_id, qty_consumed, consumed_by)
      VALUES
        (p_order_id, p_production_job_id, v_bom.material_id, v_qty, p_consumed_by);

      -- 3. Insert inventory movement (audit trail, with FK now)
      INSERT INTO inventory_movements
        (material_id, order_id, production_job_id, type, qty, reason, created_by)
      VALUES
        (v_bom.material_id, p_order_id, p_production_job_id, 'out', v_qty,
         'BOM consumption — production job ' || p_production_job_id::text,
         p_consumed_by);

      v_consumption_count := v_consumption_count + 1;
      v_total_qty := v_total_qty + v_qty;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'already_consumed', false,
    'consumption_count', v_consumption_count,
    'total_qty', v_total_qty
  );
END;
$$;

-- ============================================================
-- 5. New RPC: advance_install_booking_status
--    Cascade: install_bookings.status -> orders.status (single source of truth di orders)
--    Called dari installer schedule/checklist pages
-- ============================================================
CREATE OR REPLACE FUNCTION advance_install_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_staff_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_booking_type TEXT;
  v_old_status TEXT;
  v_order_classification TEXT;
BEGIN
  -- Get booking info
  SELECT ib.order_id, ib.status, ib.type
    INTO v_order_id, v_old_status, v_booking_type
  FROM install_bookings ib
  WHERE ib.id = p_booking_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'install_bookings.id % tidak ditemukan', p_booking_id;
  END IF;

  -- Validate new_status
  IF p_new_status NOT IN ('pending','scheduled','in_progress','done','revision','cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %. Valid: pending, scheduled, in_progress, done, revision, cancelled', p_new_status;
  END IF;

  -- Update install_bookings.status
  UPDATE install_bookings
  SET status = p_new_status
  WHERE id = p_booking_id;

  -- Cascade orders.status (hanya untuk booking type='pasang' yang linked ke order)
  IF v_booking_type = 'pasang' AND v_order_id IS NOT NULL THEN
    SELECT classification INTO v_order_classification
    FROM orders WHERE id = v_order_id;

    -- Hanya cascade kalau order classification = 'pasang' (safety check)
    IF v_order_classification = 'pasang' THEN
      IF p_new_status = 'scheduled' THEN
        UPDATE orders SET status = 'scheduled' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id,
                  'Install booking scheduled → orders.status auto-advance ke scheduled');
      ELSIF p_new_status = 'in_progress' THEN
        UPDATE orders SET status = 'installing' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_started', p_staff_id,
                  'Install sedang berjalan → orders.status auto-advance ke installing');
      ELSIF p_new_status = 'done' THEN
        UPDATE orders SET status = 'done' WHERE id = v_order_id;
        INSERT INTO order_logs (order_id, action, staff_id, notes)
          VALUES (v_order_id, 'install_done', p_staff_id,
                  'Install selesai → orders.status auto-advance ke done');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'order_id', v_order_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'order_status_cascaded', (v_booking_type = 'pasang' AND v_order_id IS NOT NULL)
  );
END;
$$;

-- ============================================================
-- 6. Backfill: untuk order 'pasang' existing di 'packed' (tanpa booking),
--    auto-create install_bookings row dengan status='pending'
-- ============================================================
INSERT INTO public.install_bookings
  (order_id, type, status, address, scheduled_date, scheduled_time, notes, created_at)
SELECT
  o.id,
  'pasang',
  'pending',
  COALESCE(c.address, 'Alamat belum di-set'),
  CURRENT_DATE,
  '00:00:00',
  'Auto-created by migration 051 (V3 backfill). Silakan Admin assign installer & tanggal.',
  NOW()
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
WHERE o.classification = 'pasang'
  AND o.status = 'packed'
  AND NOT EXISTS (
    SELECT 1 FROM public.install_bookings ib
    WHERE ib.order_id = o.id
      AND ib.type = 'pasang'
      AND ib.status NOT IN ('cancelled')
  );

-- ============================================================
-- 7. Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

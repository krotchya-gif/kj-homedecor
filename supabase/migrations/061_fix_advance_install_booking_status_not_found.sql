-- ============================================================
-- 061_fix_advance_install_booking_status_not_found.sql
-- BUG: RPC advance_install_booking_status raise "tidak ditemukan"
--      untuk booking type 'survey' (order_id NULL) padahal booking ADA.
--      Kondisi salah: IF v_order_id IS NULL → harus IF NOT FOUND
--      (PL/pgSQL row-not-found setelah SELECT INTO).
-- Gejala: cancel/update status booking survey di /admin/booking → 500
--         "install_bookings.id ... tidak ditemukan"
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

  -- FIX (061): deteksi row benar-benar tidak ada pakai NOT FOUND.
  -- Sebelumnya cek v_order_id IS NULL -> booking survey (order_id NULL)
  -- dianggap "tidak ditemukan" walau row ada.
  IF NOT FOUND THEN
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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

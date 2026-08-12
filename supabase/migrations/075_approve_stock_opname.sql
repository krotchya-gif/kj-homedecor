-- ============================================================
-- 075 — Stock Opname: RPC approve + terapkan selisih ke stok
-- ============================================================
-- Menutup flow stock opname: sesi 'submitted' → disetujui finance/admin/owner.
--  1. Validasi role (finance/admin/owner aktif) + status sesi = 'submitted'
--  2. Terapkan selisih (counted - system) ke materials.stock_gudang (floor 0)
--  3. Catat inventory_movements type='adjustment' per item (audit trail)
--  4. Update session -> approved (approved_by/approved_at)
-- Idempotent: sesi sudah approved → return info tanpa re-process.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_stock_opname(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'active' AND role IN ('finance','admin','owner')
  ) THEN
    RAISE EXCEPTION 'Forbidden: hanya finance/admin/owner';
  END IF;

  SELECT status INTO v_status FROM public.stock_opname_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi stock opname tidak ditemukan';
  END IF;

  IF v_status = 'approved' THEN
    RETURN jsonb_build_object('idempotent', true, 'message', 'Sesi sudah disetujui');
  END IF;
  IF v_status <> 'submitted' THEN
    RAISE EXCEPTION 'Status sesi harus "submitted" (sekarang: %)', v_status;
  END IF;

  -- Terapkan selisih ke stok gudang (floor 0)
  UPDATE public.materials m
  SET stock_gudang = GREATEST(COALESCE(m.stock_gudang, 0) + i.difference, 0)
  FROM public.stock_opname_items i
  WHERE i.session_id = p_session_id AND i.material_id = m.id;

  -- Audit trail inventory_movements per item
  INSERT INTO public.inventory_movements (material_id, type, qty, from_location, reason, created_by)
  SELECT material_id, 'adjustment', difference, 'gudang',
    'Stock opname sesi ' || p_session_id::text, auth.uid()
  FROM public.stock_opname_items
  WHERE session_id = p_session_id;

  UPDATE public.stock_opname_sessions
  SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('idempotent', false, 'message', 'Sesi disetujui & selisih diterapkan ke stok');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_stock_opname FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_stock_opname FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_stock_opname TO authenticated;

NOTIFY pgrst, 'reload schema';

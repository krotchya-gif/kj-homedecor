-- ============================================================
-- 081 — RPC search_orders (filter search+status+kategori di SQL)
-- ============================================================
-- Latar (BUG-079, sesi 18): query search admin/orders memakai
-- `query.or('order_number.ilike.%..%,tracking_number.ilike.%..%,customer.name.ilike.%..%')`
-- — PostgREST .or() TIDAK mendukung kolom tabel relasi (customer.name)
-- → query error diam-diam → UI search kosong walau data ada.
-- Solusi: RPC SQL yang menyelesaikan semua filter (termasuk nama pelanggan
-- via EXISTS) di satu tempat, return { rows, total } → pagination benar.
-- Role: semua staff aktif (dipakai halaman /admin/orders).
-- Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_orders(
  p_term TEXT DEFAULT '',
  p_status TEXT DEFAULT '',
  p_category UUID DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_staff_active_sd() AND auth.jwt() ->> 'role' <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH base AS (
    SELECT o.*
    FROM orders o
    WHERE
      -- search: no. order / tracking / nama pelanggan (OR antar ketiganya)
      (
        p_term IS NULL OR p_term = ''
        OR o.order_number ILIKE '%' || p_term || '%'
        OR COALESCE(o.tracking_number, '') ILIKE '%' || p_term || '%'
        OR EXISTS (
          SELECT 1 FROM customers c
          WHERE c.id = o.customer_id AND c.name ILIKE '%' || p_term || '%'
        )
      )
      -- status: ready_to_pack (ready + kirim), ready_to_ship (packed), atau status langsung
      AND (
        p_status IS NULL OR p_status = ''
        OR (p_status = 'ready_to_pack' AND o.status = 'ready' AND o.classification = 'kirim')
        OR (p_status = 'ready_to_ship' AND o.status = 'packed')
        OR o.status = p_status
      )
      -- kategori: order punya item dengan produk kategori tsb
      AND (
        p_category IS NULL
        OR EXISTS (
          SELECT 1 FROM order_items oi
          JOIN products pr ON pr.id = oi.product_id
          WHERE oi.order_id = o.id AND pr.category_id = p_category
        )
      )
  )
  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'order_number', b.order_number,
          'order_id_external', b.order_id_external,
          'source', b.source,
          'customer_id', b.customer_id,
          'classification', b.classification,
          'status', b.status,
          'total_amount', b.total_amount,
          'dp_amount', b.dp_amount,
          'lunas_amount', b.lunas_amount,
          'shipping_cost', b.shipping_cost,
          'payment_status', b.payment_status,
          'notes', b.notes,
          'admin_notes', b.admin_notes,
          'tracking_number', b.tracking_number,
          'courier', b.courier,
          'created_at', b.created_at,
          'order_date', b.order_date,
          'estimated_completion', b.estimated_completion,
          'scheduled_installation_date', b.scheduled_installation_date,
          'customer', (
            SELECT jsonb_build_object('name', c.name, 'phone', c.phone)
            FROM customers c WHERE c.id = b.customer_id
          ),
          'order_items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'price', oi.price,
                'qty', oi.qty,
                'custom_specs', oi.custom_specs,
                'product', (
                  SELECT jsonb_build_object(
                    'id', pr.id,
                    'name', pr.name,
                    'category', (
                      SELECT jsonb_build_object('name', cat.name)
                      FROM categories cat WHERE cat.id = pr.category_id
                    )
                  )
                  FROM products pr WHERE pr.id = oi.product_id
                )
              )
            )
            FROM order_items oi WHERE oi.order_id = b.id
          ), '[]'::jsonb)
        )
      )
      FROM base b
      ORDER BY b.created_at DESC
      LIMIT p_limit OFFSET p_offset
    ), '[]'::jsonb),
    'total', (SELECT count(*)::int FROM base)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_orders(TEXT, TEXT, UUID, INT, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

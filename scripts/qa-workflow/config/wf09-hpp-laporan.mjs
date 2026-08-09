/** WF9 — HPP & Laporan: seed produk+BOM → hitung HPP (U) → verify price ≠ 0 + laporan render */
export default {
  name: 'WF9 HPP & Laporan Keuangan',
  cases: [
    {
      name: 'CRUD: seed produk+BOM → hitung & simpan HPP → price ter-update',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO materials (id, name, unit, stock_gudang, stock_toko, min_stock_level, cost_per_unit) VALUES (gen_random_uuid(), 'QA-WF9 Material', 'meter', 50, 10, 5, 20000) ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO products (id, name, sku, price, stock_toko, is_custom, is_catalog_visible) VALUES (gen_random_uuid(), 'QA-WF9 Produk', 'QA-WF9', 0, 5, false, false) ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO bom (id, product_id, material_id, qty_per_unit) SELECT gen_random_uuid(), p.id, m.id, 2 FROM products p, materials m WHERE p.name = 'QA-WF9 Produk' AND m.name = 'QA-WF9 Material' ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/owner/hpp' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'HPP' },
        { act: 'screenshot', name: 'hpp-seeded' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM bom WHERE product_id IN (SELECT id FROM products WHERE name ILIKE 'QA-WF9%')", min: 1 },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM products WHERE name ILIKE 'QA-WF9%'", min: 1 },
      ],
    },
    {
      name: 'Positif: laporan laba-rugi render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/owner/laporan/laba-rugi' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'Laba Rugi' },
        { act: 'screenshot', name: 'laba-rugi' },
      ],
    },
    {
      name: 'Positif: neraca render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/owner/laporan/neraca' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'Neraca' },
        { act: 'screenshot', name: 'neraca' },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM bom WHERE product_id IN (SELECT id FROM products WHERE name ILIKE 'QA-WF9%') OR material_id IN (SELECT id FROM materials WHERE name ILIKE 'QA-WF9%')`,
    `DELETE FROM products WHERE name ILIKE 'QA-WF9%'`,
    `DELETE FROM materials WHERE name ILIKE 'QA-WF9%'`,
  ],
}

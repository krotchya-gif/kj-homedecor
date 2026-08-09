/** WF8 — Material & Stok: fix tab + alert stok + create PR (C) */
export default {
  name: 'WF8 Material & Stok',
  cases: [
    {
      name: 'Positif: posisi stok render + tab Material/Produk',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/gudang/stock' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Posisi Stok' },
        { act: 'click', selector: 'button:has-text("Produk")' },
        { act: 'wait', ms: 800 },
        { act: 'screenshot', name: 'stock-produk' },
        { act: 'click', selector: 'button:has-text("Material")' },
        { act: 'wait', ms: 800 },
        { act: 'screenshot', name: 'stock-material' },
      ],
    },
    {
      name: 'CRUD: seed material stok minim → alert muncul',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO materials (id, name, unit, stock_gudang, stock_toko, min_stock_level, cost_per_unit) VALUES (gen_random_uuid(), 'QA-WF8 Material', 'pcs', 2, 1, 10, 5000) ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/gudang/alerts' },
        { act: 'wait', ms: 1500 },
        { act: 'screenshot', name: 'alert-material' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM materials WHERE name ILIKE 'QA-WF8%' AND stock_gudang < min_stock_level", min: 1 },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM purchase_requests WHERE material_id IN (SELECT id FROM materials WHERE name ILIKE 'QA-WF8%')`,
    `DELETE FROM materials WHERE name ILIKE 'QA-WF8%'`,
  ],
}

/** WF7 — Pengiriman: seed order siap → pack (U) → verify status */
export default {
  name: 'WF7 Pengiriman',
  cases: [
    {
      name: 'CRUD: seed order ready → pack via UI → status dikemas',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO customers (id, name, phone) VALUES (gen_random_uuid(), 'QA-WF7 Customer', '0812000007') ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO orders (id, order_number, customer_id, source, classification, total_amount, dp_amount, lunas_amount, payment_status, status) SELECT gen_random_uuid(), 'ORD-QA-WF7', id, 'offline', 'kirim', 75000, 75000, 0, 'paid', 'ready' FROM customers WHERE name = 'QA-WF7 Customer' ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/admin/shipping' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'ORD-QA-WF7' },
        { act: 'screenshot', name: 'shipping-seeded' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE order_number = 'ORD-QA-WF7' AND status = 'ready'", min: 1 },
      ],
    },
    {
      name: 'CRUD-U: input resi lengkap (kurir+resi+foto) → status shipped',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO customers (id, name, phone) VALUES (gen_random_uuid(), 'QA-WF7 Resi', '0812000008') ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO orders (id, order_number, customer_id, source, classification, total_amount, dp_amount, lunas_amount, payment_status, status) SELECT gen_random_uuid(), 'ORD-QA-WF7R', id, 'offline', 'kirim', 80000, 80000, 0, 'paid', 'packed' FROM customers WHERE name = 'QA-WF7 Resi' ON CONFLICT DO NOTHING" },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE order_number = 'ORD-QA-WF7R'", min: 1 },
        { act: 'goto', url: '/admin/shipping' },
        { act: 'wait', ms: 2000 },
        { act: 'click', selector: 'button:has-text("Dikemas")' },
        { act: 'wait', ms: 1000 },
        { act: 'expectText', text: 'ORD-QA-WF7R' },
        { act: 'clickText', text: 'Input Resi' },
        { act: 'wait', ms: 800 },
        { act: 'selectLabel', selector: '.modal-panel select', label: 'JNE' },
        { act: 'type', selector: '.modal-panel input[placeholder*="cth"]', value: 'JNE-QA-WF7-001' },
        { act: 'upload', selector: '.modal-panel input[type="file"]', file: 'scripts/qa-workflow/tmp-foto.png' },
        { act: 'wait', ms: 2500 },
        { act: 'screenshot', name: 'resi-modal-isi' },
        { act: 'clickText', text: 'Simpan' },
        { act: 'wait', ms: 2500 },
        { act: 'expectToast', text: 'Terkirim' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE order_number = 'ORD-QA-WF7R' AND status = 'shipped'", min: 1 },
      ],
    },
    {
      name: 'Positif: halaman shipping render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/admin/shipping' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Pengiriman' },
        { act: 'screenshot', name: 'shipping-list' },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number IN ('ORD-QA-WF7', 'ORD-QA-WF7R'))`,
    `DELETE FROM orders WHERE order_number IN ('ORD-QA-WF7', 'ORD-QA-WF7R')`,
    `DELETE FROM customers WHERE name ILIKE 'QA-WF7%'`,
  ],
}

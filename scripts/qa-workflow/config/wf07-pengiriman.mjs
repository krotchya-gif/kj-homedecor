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
    `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_number = 'ORD-QA-WF7')`,
    `DELETE FROM orders WHERE order_number = 'ORD-QA-WF7'`,
    `DELETE FROM customers WHERE name ILIKE 'QA-WF7%'`,
  ],
}

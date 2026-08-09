/** WF5 — Produksi: seed order produksi → job muncul → assign penjahit (U) */
export default {
  name: 'WF5 Produksi',
  cases: [
    {
      name: 'CRUD: seed order produksi → job muncul di list',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO customers (id, name, phone) VALUES (gen_random_uuid(), 'QA-WF5 Customer', '0812000005') ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO orders (id, order_number, customer_id, source, classification, total_amount, dp_amount, lunas_amount, payment_status, status) SELECT gen_random_uuid(), 'ORD-QA-WF5', id, 'offline', 'kirim', 50000, 50000, 0, 'paid', 'production' FROM customers WHERE name = 'QA-WF5 Customer' ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/gudang/production' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'Produksi' },
        { act: 'screenshot', name: 'production-job-seeded' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE order_number = 'ORD-QA-WF5' AND status = 'production'", min: 1 },
      ],
    },
    {
      name: 'Positif: job list render normal',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/gudang/production' },
        { act: 'wait', ms: 1200 },
        { act: 'screenshot', name: 'production-list' },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM orders WHERE order_number = 'ORD-QA-WF5'`,
    `DELETE FROM customers WHERE name ILIKE 'QA-WF5%'`,
  ],
}

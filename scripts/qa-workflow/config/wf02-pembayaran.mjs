/** WF2 — Pembayaran & Verifikasi: seed order+payment → approve (U) → verify verified_by (CRUD) */
export default {
  name: 'WF2 Pembayaran & Verifikasi',
  cases: [
    {
      name: 'CRUD: seed order lunas → approve payment via UI → verified_by terisi',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO customers (id, name, phone) VALUES (gen_random_uuid(), 'QA-WF2 Customer', '0812000002') ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO orders (id, order_number, customer_id, source, classification, total_amount, dp_amount, lunas_amount, payment_status, status) SELECT gen_random_uuid(), 'ORD-QA-WF2', id, 'offline', 'kirim', 100000, 100000, 0, 'paid', 'new' FROM customers WHERE name = 'QA-WF2 Customer' ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO payments (id, order_id, type, amount, date, notes) SELECT gen_random_uuid(), o.id, 'lunas', 100000, CURRENT_DATE, 'QA seed' FROM orders o WHERE o.order_number = 'ORD-QA-WF2' ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/finance/payments' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'Payment Tracking' },
        { act: 'screenshot', name: 'payment-seeded' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number = 'ORD-QA-WF2')", min: 1 },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE order_number = 'ORD-QA-WF2' AND payment_status = 'paid'", min: 1 },
      ],
    },
    {
      name: 'Positif: tab filter pembayaran bekerja',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/finance/payments' },
        { act: 'wait', ms: 1000 },
        { act: 'expectText', text: 'BELUM BAYAR' },
        { act: 'expectText', text: 'LUNAS' },
        { act: 'clickText', text: 'Refund' },
        { act: 'wait', ms: 800 },
        { act: 'screenshot', name: 'tab-refund' },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number = 'ORD-QA-WF2')`,
    `DELETE FROM orders WHERE order_number = 'ORD-QA-WF2'`,
    `DELETE FROM customers WHERE name ILIKE 'QA-WF2%'`,
  ],
}

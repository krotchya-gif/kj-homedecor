/** WF10 — Hutang & Piutang: CRUD UI (Tambah → tampil → cleanup) + piutang render */
export default {
  name: 'WF10 Hutang & Piutang',
  cases: [
    {
      name: 'CRUD-C: tambah tagihan via UI → verify DB',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO suppliers (id, name, contact) VALUES (gen_random_uuid(), 'QA-WF10 Supplier', '0812') ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/finance/hutang' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Hutang' },
        { act: 'click', selector: 'button:has-text("Tambah Tagihan")' },
        { act: 'wait', ms: 800 },
        { act: 'selectLabel', selector: 'form select', label: 'QA-WF10 Supplier' },
        { act: 'type', selector: 'form input[type="text"]', value: 'INV-QA-WF10-UI' },
        { act: 'type', selector: 'form input[type="date"]', value: '2026-08-09' },
        { act: 'type', selector: 'form input[type="number"]', value: '150000' },
        { act: 'screenshot', name: 'form-tagihan-isi' },
        { act: 'click', selector: 'form button[type="submit"]' },
        { act: 'wait', ms: 1500 },
        { act: 'expectToast', text: '' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM hutang WHERE invoice_number = 'INV-QA-WF10-UI'", min: 1 },
      ],
    },
    {
      name: 'CRUD-R: seed hutang → tampil di list + DB',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'dbExec', sql: "INSERT INTO suppliers (id, name, contact) VALUES (gen_random_uuid(), 'QA-WF10 Supplier', '0812') ON CONFLICT DO NOTHING" },
        { act: 'dbExec', sql: "INSERT INTO hutang (id, supplier_id, invoice_number, invoice_date, amount, status, created_by) SELECT gen_random_uuid(), id, 'INV-QA-WF10', CURRENT_DATE, 150000, 'pending', (SELECT id FROM users WHERE role = 'owner' LIMIT 1) FROM suppliers WHERE name = 'QA-WF10 Supplier' ON CONFLICT DO NOTHING" },
        { act: 'goto', url: '/finance/hutang' },
        { act: 'wait', ms: 1500 },
        { act: 'screenshot', name: 'hutang-seeded' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM hutang WHERE invoice_number = 'INV-QA-WF10'", min: 1 },
      ],
    },
    {
      name: 'Positif: halaman piutang render + channel',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/finance/piutang' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Piutang' },
        { act: 'screenshot', name: 'piutang-list' },
        { act: 'goto', url: '/finance/piutang/channel' },
        { act: 'wait', ms: 1000 },
        { act: 'screenshot', name: 'piutang-channel' },
      ],
    },
  ],
  cleanup: [
    `DELETE FROM hutang WHERE invoice_number IN ('INV-QA-WF10', 'INV-QA-WF10-UI') OR supplier_id IN (SELECT id FROM suppliers WHERE name ILIKE 'QA-WF10%')`,
    `DELETE FROM suppliers WHERE name ILIKE 'QA-WF10%'`,
  ],
}

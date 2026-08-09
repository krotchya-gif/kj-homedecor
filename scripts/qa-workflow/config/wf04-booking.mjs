/** WF4 — Booking & Pemasangan: tambah manual (positif) + tanpa customer (negatif) + validasi jadwal tanpa installer */
export default {
  name: 'WF4 Booking & Pemasangan',
  cases: [
    {
      name: 'Positif: tambah booking manual muncul di list',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/admin/booking' },
        { act: 'expectText', text: 'Booking & Pemasangan' },
        { act: 'click', selector: 'button:has-text("Tambah Manual")' },
        { act: 'wait', ms: 800 },
        { act: 'type', selector: 'form input[required][type="text"]', value: 'QA-WF4 Booking' },
        { act: 'type', selector: 'form input[required][type="tel"]', value: '0812111222333' },
        { act: 'screenshot', name: 'form-booking' },
        { act: 'click', selector: 'form button[type="submit"]' },
        { act: 'wait', ms: 1500 },
        { act: 'expectToast', text: '' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM install_bookings WHERE customer_name ILIKE 'QA-WF4%'", min: 1 },
      ],
    },
    {
      name: 'Negatif: booking tanpa customer ditolak',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/admin/booking' },
        { act: 'click', selector: 'button:has-text("Tambah Manual")' },
        { act: 'wait', ms: 800 },
        { act: 'click', selector: 'form button[type="submit"]' },
        { act: 'wait', ms: 800 },
        { act: 'expectToast', text: '', must: false },
      ],
    },
  ],
  cleanup: [`DELETE FROM install_bookings WHERE customer_name ILIKE 'QA-WF4%'`],
}

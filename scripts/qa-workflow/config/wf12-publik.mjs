/** WF12 — Publik: landing render + katalog + booking publik (positif) + booking tanpa nama (negatif) */
export default {
  name: 'WF12 Publik',
  cases: [
    {
      name: 'Positif: landing render lengkap 0 error',
      steps: [
        { act: 'goto', url: '/' },
        { act: 'expectText', text: 'Percantik Ruanganmu' },
        { act: 'expectText', text: 'Produk Pilihan' },
        { act: 'expectText', text: 'Portofolio' },
        { act: 'screenshot', name: 'landing-hero' },
        { act: 'expectText', text: 'Lihat Semua Katalog' },
      ],
    },
    {
      name: 'Positif: halaman katalog lengkap',
      steps: [
        { act: 'goto', url: '/catalog' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'Katalog Lengkap' },
        { act: 'screenshot', name: 'katalog' },
      ],
    },
    {
      name: 'Positif: booking publik lengkap sukses',
      steps: [
        { act: 'goto', url: '/booking' },
        { act: 'wait', ms: 800 },
        { act: 'type', placeholder: 'Masukkan nama lengkap', value: 'QA-WF12 Booking' },
        { act: 'type', placeholder: '08xxxxxxxxxx', value: '081299887766' },
        { act: 'clickText', text: 'Visit Toko' },
        { act: 'wait', ms: 400 },
        { act: 'clickText', text: '15' },
        { act: 'wait', ms: 600 },
        { act: 'clickText', text: '10:00' },
        { act: 'wait', ms: 400 },
        { act: 'screenshot', name: 'booking-lengkap' },
        { act: 'clickText', text: 'Booking Sekarang' },
        { act: 'wait', ms: 2000 },
        { act: 'expectToast', text: '' },
      ],
    },
    {
      name: 'Negatif: booking tanpa nama → tombol disabled (tidak bisa submit)',
      steps: [
        { act: 'goto', url: '/booking' },
        { act: 'wait', ms: 800 },
        { act: 'expectDisabled', selector: 'button[type="submit"]' },
        { act: 'screenshot', name: 'booking-kosong-disabled' },
      ],
    },
  ],
  cleanup: [`DELETE FROM install_bookings WHERE customer_name ILIKE 'QA-WF12%'`],
}

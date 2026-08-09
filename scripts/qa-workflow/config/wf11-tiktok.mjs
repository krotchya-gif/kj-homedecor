/** WF11 — TikTok Sync: halaman + verifikasi order TikTok real + detail item (R) */
export default {
  name: 'WF11 TikTok Shop Sync',
  cases: [
    {
      name: 'Positif: halaman TikTok Shop render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/owner/tiktok' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'TikTok' },
        { act: 'screenshot', name: 'tiktok-page' },
      ],
    },
    {
      name: 'CRUD-R: order TikTok ada + detail order punya item',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/admin/orders' },
        { act: 'wait', ms: 1500 },
        { act: 'expectText', text: 'TikTok' },
        { act: 'screenshot', name: 'orders-tiktok' },
        { act: 'dbExpect', sql: "SELECT count(*) AS n FROM orders WHERE source = 'tiktok'", min: 1 },
      ],
    },
    {
      name: 'Positif: statistik marketplace render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/owner/marketplace' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Marketplace' },
        { act: 'screenshot', name: 'marketplace-page' },
      ],
    },
  ],
  cleanup: [],
}

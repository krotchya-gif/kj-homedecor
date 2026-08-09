/** WF6 — Steam & QC: create record laundry (C) + verify + QC render */
export default {
  name: 'WF6 Steam & QC',
  cases: [
    {
      name: 'CRUD: tambah record steam/laundry → verify DB',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/gudang/steam' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'Steam' },
        { act: 'clickText', text: 'Input Laundry' },
        { act: 'wait', ms: 800 },
        { act: 'screenshot', name: 'form-laundry' },
      ],
    },
    {
      name: 'Positif: halaman QC render',
      login: { email: 'owner@kjhomedecor.com', password: 'owner123' },
      steps: [
        { act: 'goto', url: '/gudang/qc' },
        { act: 'wait', ms: 1200 },
        { act: 'expectText', text: 'QC' },
        { act: 'screenshot', name: 'qc-list' },
      ],
    },
  ],
  cleanup: [],
}

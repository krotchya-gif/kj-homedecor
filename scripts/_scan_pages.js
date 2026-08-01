// Scan semua halaman dashboard: deteksi error SSR (500), redirect ke login, waktu load
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const REF = URL.match(/\/\/([^.]+)\./)[1]
const COOKIE_NAME = `sb-${REF}-auth-token`

const PAGES = [
  // admin
  '/admin', '/admin/catalog', '/admin/catalog/products', '/admin/catalog/categories', '/admin/catalog/banners',
  '/admin/orders', '/admin/customers', '/admin/booking', '/admin/portfolio', '/admin/reports',
  '/admin/staff', '/admin/shipping', '/admin/laundry', '/admin/landing', '/admin/seo',
  // finance
  '/finance', '/finance/accounts', '/finance/accounts/accounts', '/finance/accounts/categories', '/finance/accounts/mapping',
  '/finance/assets', '/finance/cash', '/finance/cash/expense', '/finance/cash/income', '/finance/cash/mutation',
  '/finance/cash/transfer', '/finance/hutang', '/finance/hutang/proses', '/finance/hutang/retur', '/finance/journal',
  '/finance/journal/auto', '/finance/journal/reports/balance', '/finance/journal/reports/cash-mutation',
  '/finance/journal/reports/cogs-chronology', '/finance/journal/reports/journal-list', '/finance/journal/reports/ledger',
  '/finance/journal/reports/profit-loss', '/finance/laporan', '/finance/laporan/buku-besar', '/finance/laporan/daftar-jurnal',
  '/finance/laporan/kronologi-hpp', '/finance/laporan/laba-rugi', '/finance/laporan/mutasi-kas', '/finance/laporan/neraca',
  '/finance/laporan/neraca-saldo', '/finance/laporan/performa-tag', '/finance/laporan/umur-hutang', '/finance/laporan/umur-piutang',
  '/finance/laundry-payroll', '/finance/payments', '/finance/piutang', '/finance/piutang/channel', '/finance/piutang/faktur',
  '/finance/piutang/payment', '/finance/piutang/process', '/finance/piutang/retur', '/finance/reports', '/finance/settings',
  // gudang
  '/gudang', '/gudang/alerts', '/gudang/lembur', '/gudang/production', '/gudang/qc', '/gudang/reports',
  '/gudang/steam', '/gudang/stock', '/gudang/stock/opname',
  // installer
  '/installer', '/installer/checklist', '/installer/reports', '/installer/schedule',
  // owner
  '/owner', '/owner/hpp', '/owner/laporan', '/owner/laporan/buku-besar', '/owner/laporan/daftar-jurnal',
  '/owner/laporan/kronologi-hpp', '/owner/laporan/laba-rugi', '/owner/laporan/mutasi-kas', '/owner/laporan/neraca',
  '/owner/laporan/neraca-saldo', '/owner/laporan/performa-tag', '/owner/laporan/umur-hutang', '/owner/laporan/umur-piutang',
  '/owner/marketplace', '/owner/materials', '/owner/products', '/owner/staff', '/owner/suppliers',
  '/owner/suppliers/price-history', '/owner/tiktok', '/owner/tiktok/migrate',
  // penjahit
  '/penjahit', '/penjahit/history', '/penjahit/jobs', '/penjahit/reports',
  // halaman dinamis
  '/admin/orders/b432f0d5-4b11-40c0-b5e0-3139fa0a8b1e', // order id dummy? pakai order asli di bawah
]

async function main() {
  const sb = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword({ email: 'qa.test.kj@hermes.local', password: 'QaTest123!' })
  if (error) { console.log('LOGIN FAIL:', error.message); process.exit(1) }
  const session = data.session
  const sessionJson = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: 'bearer',
    user: session.user,
  })
  const enc = 'base64-' + Buffer.from(sessionJson).toString('base64url')
  // @supabase/ssr v0.10.2: value = 'base64-' + base64url(session JSON);
  // chunking hanya dipakai kalau > 3180 chars (session QA ~1970 → 1 cookie tanpa suffix)
  const cookieHeader = `${COOKIE_NAME}=${enc}`

  // ambil 1 order id asli utk halaman detail
  const { data: ord } = await sb.from('orders').select('id').limit(1)
  const orderId = ord?.[0]?.id

  let ok = 0, fail = 0
  const failures = []
  for (const p of PAGES) {
    const url = 'http://localhost:3100' + p
    const t0 = Date.now()
    try {
      const r = await fetch(url, { headers: { Cookie: cookieHeader }, redirect: 'manual' })
      const ms = Date.now() - t0
      const loc = r.headers.get('location') || ''
      const isRedirect = r.status >= 300 && r.status < 400
      const toLogin = isRedirect && loc.includes('login')
      const body = r.status < 400 ? await r.text() : ''
      const hasErrBoundary = body.includes('Application error') || body.includes('Internal Server Error') || body.includes('digest')
      if (r.status >= 500 || hasErrBoundary) {
        fail++
        failures.push({ p, status: r.status, ms, note: 'SSR ERROR / error boundary di HTML' })
      } else if (toLogin) {
        fail++
        failures.push({ p, status: r.status, ms, note: `redirect ke login (${loc}) — kemungkinan role/path guard` })
      } else {
        ok++
        console.log(`OK  ${r.status} ${ms}ms ${p}`)
      }
    } catch (e) {
      fail++
      failures.push({ p, status: 'ERR', ms: Date.now() - t0, note: e.message.slice(0, 100) })
    }
  }
  console.log('\n===== HASIL =====')
  console.log(`OK: ${ok} | MASALAH: ${fail}${orderId ? `\norderId utk tes manual: ${orderId}` : ''}`)
  if (failures.length) { console.log(JSON.stringify(failures, null, 1)) }
}
main()

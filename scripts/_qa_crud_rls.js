// CRUD test langsung via Supabase client dengan session user (RLS) per role
require('dotenv').config({ path: '.env.local' })
const { chromium } = require('playwright')

const CREDS = {
  admin: ['qa.admin.1785643503918@hermes.local', 'QaTest123!'],
  finance: ['qa.finance.1785643504650@hermes.local', 'QaTest123!'],
  gudang: ['qa.gudang.1785643504940@hermes.local', 'QaTest123!'],
  penjahit: ['qa.penjahit.1785643505176@hermes.local', 'QaTest123!'],
  installer: ['qa.installer.1785643505395@hermes.local', 'QaTest123!'],
  owner: ['qa.owner.1785643505609@hermes.local', 'QaTest123!']
}

const T = Date.now().toString(36).slice(-5)
const SUPABASE_URL = 'https://glblgsfenarnztawtpmu.supabase.co'

async function main() {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const report = []

  for (const [role, [email]] of Object.entries(CREDS)) {
    const ctx = await b.newContext()
    const page = await ctx.newPage()
    await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(400)
    await page.fill('input[type=email], input[name=email]', email).catch(() => {})
    await page.fill('input[type=password]', 'QaTest123!')
    await page.click('button[type=submit]')
    await page.waitForTimeout(2500)

    const roleTests = []
    // ambil access token dari cookie session (base64- + base64url(JSON))
    const cookies = await ctx.cookies()
    const sb = cookies.find((c) => c.name.includes('auth-token'))
    let accessToken = null
    if (sb) {
      try {
        const b64 = sb.value.replace(/^base64-/, '').replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
        accessToken = payload.access_token || null
      } catch (e) {
        roleTests.push('⚠️ cookie parse gagal: ' + e.message.slice(0, 50))
      }
    }

    const sup = async (path, opts = {}) => {
      const res = await ctx.request.fetch(SUPABASE_URL + path, {
        headers: {
          'Authorization': 'Bearer ' + (accessToken || ''),
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        ...opts
      })
      let j = null
      try { j = await res.json() } catch {}
      return { status: res.status(), j }
    }

    if (!accessToken) {
      roleTests.push('❌ TIDAK DAPAT ACCESS TOKEN')
    } else {
      if (role === 'admin') {
        // products: C + R + U + D
        const name = 'QA RLS Prod ' + T
        let r = await sup('/rest/v1/products?select=id', {
          method: 'POST', data: JSON.stringify({ name, price: 25000, stock_toko: 3, product_type: 'perabot', is_catalog_visible: false })
        })
        roleTests.push('C products → ' + r.status + (r.status === 201 ? ' ✅' : ' ❌ ' + JSON.stringify(r.j).slice(0, 100)))
        r = await sup('/rest/v1/products?select=id,name&name=eq.' + encodeURIComponent(name))
        const found = r.j?.[0]?.id
        roleTests.push('R products → ' + r.status + ' id=' + (found ? found.slice(0, 8) : 'none'))
        if (found) {
          r = await sup('/rest/v1/products?id=eq.' + found, { method: 'PATCH', data: JSON.stringify({ price: 26000 }) })
          roleTests.push('U products → ' + r.status + (r.status === 204 ? ' ✅' : ''))
          r = await sup('/rest/v1/products?id=eq.' + found, { method: 'DELETE' })
          roleTests.push('D products → ' + r.status + (r.status === 204 ? ' ✅' : ''))
        }
        // customers C+D
        const cusName = 'QA RLS Cus ' + T
        r = await sup('/rest/v1/customers?select=id', { method: 'POST', data: JSON.stringify({ name: cusName, phone: '0812' + T }) })
        roleTests.push('C customers → ' + r.status + (r.status === 201 ? ' ✅' : ' ❌ ' + JSON.stringify(r.j).slice(0, 100)))
        const cusId = r.j?.[0]?.id
        if (cusId) {
          r = await sup('/rest/v1/customers?id=eq.' + cusId, { method: 'DELETE' })
          roleTests.push('D customers → ' + r.status + (r.status === 204 ? ' ✅' : ''))
        }
        // users R (role check)
        r = await sup('/rest/v1/users?select=id&limit=1')
        roleTests.push('R users → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }

      if (role === 'owner') {
        // materials C + R + U + D
        const name = 'QA RLS Mat ' + T
        let r = await sup('/rest/v1/materials?select=id', { method: 'POST', data: JSON.stringify({ name, unit: 'meter', cost_per_unit: 5000, stock_gudang: 10, stock_toko: 2, min_stock_level: 1 }) })
        roleTests.push('C materials → ' + r.status + (r.status === 201 ? ' ✅' : ' ❌ ' + JSON.stringify(r.j).slice(0, 100)))
        const r2 = await sup('/rest/v1/materials?select=id&name=eq.' + encodeURIComponent(name))
        const mid = r2.j?.[0]?.id
        if (mid) {
          r = await sup('/rest/v1/materials?id=eq.' + mid, { method: 'PATCH', data: JSON.stringify({ stock_gudang: 15 }) })
          roleTests.push('U materials → ' + r.status + (r.status === 204 ? ' ✅' : ''))
          r = await sup('/rest/v1/materials?id=eq.' + mid, { method: 'DELETE' })
          roleTests.push('D materials → ' + r.status + (r.status === 204 ? ' ✅' : ''))
        }
        // orders R
        r = await sup('/rest/v1/orders?select=id&limit=1')
        roleTests.push('R orders → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
        // laporan: journal R
        r = await sup('/rest/v1/journal_entries?select=id&limit=1')
        roleTests.push('R journal_entries → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }

      if (role === 'finance') {
        r = await sup('/rest/v1/journal_entries?select=id&limit=1')
        roleTests.push('R journal_entries → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
        r = await sup('/rest/v1/payments?select=id&limit=1')
        roleTests.push('R payments → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌ ' + JSON.stringify(r.j).slice(0, 60)))
        r = await sup('/rest/v1/orders?select=id&limit=1')
        roleTests.push('R orders → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }

      if (role === 'gudang') {
        r = await sup('/rest/v1/products?select=id&limit=1')
        roleTests.push('R products → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
        r = await sup('/rest/v1/orders?select=id&limit=1')
        roleTests.push('R orders → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }

      if (role === 'penjahit') {
        r = await sup('/rest/v1/orders?select=id&limit=1')
        roleTests.push('R orders → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }

      if (role === 'installer') {
        r = await sup('/rest/v1/install_bookings?select=id&limit=1')
        roleTests.push('R install_bookings → ' + r.status + (r.status === 200 ? ' ✅' : ' ❌'))
      }
    }

    report.push(['ROLE ' + role.toUpperCase(), roleTests])
    await ctx.close()
  }

  await b.close()
  console.log('========== SUPABASE RLS CRUD TEST ==========')
  for (const [name, tests] of report) {
    console.log('\n### ' + name)
    tests.forEach((t) => console.log('  ' + t))
  }
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })

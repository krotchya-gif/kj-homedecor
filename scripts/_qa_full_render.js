// QA render nyata menyeluruh via Playwright (chrome lokal)
// Login → render tiap halaman → tangkap console error + request failed + 4xx/5xx + error boundary
const { chromium } = require('playwright')

const BASE = 'http://localhost:3100'
const EMAIL = 'qa.test.kj@hermes.local'
const PASSWORD = 'QaTest123!'

const PAGES = [
  '/', '/catalog', '/booking',
  '/admin', '/admin/catalog', '/admin/catalog/products', '/admin/catalog/categories', '/admin/catalog/banners',
  '/admin/orders', '/admin/orders/00bd88eb-9559-4bca-986d-8a9ccf404158', '/admin/customers', '/admin/booking',
  '/admin/portfolio', '/admin/reports', '/admin/staff', '/admin/shipping', '/admin/laundry', '/admin/landing-settings', '/admin/seo',
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
  '/gudang', '/gudang/alerts', '/gudang/lembur', '/gudang/production', '/gudang/qc', '/gudang/reports',
  '/gudang/steam', '/gudang/stock', '/gudang/stock/opname',
  '/installer', '/installer/checklist', '/installer/reports', '/installer/schedule',
  '/owner', '/owner/hpp', '/owner/laporan', '/owner/laporan/buku-besar', '/owner/laporan/daftar-jurnal',
  '/owner/laporan/kronologi-hpp', '/owner/laporan/laba-rugi', '/owner/laporan/mutasi-kas', '/owner/laporan/neraca',
  '/owner/laporan/neraca-saldo', '/owner/laporan/performa-tag', '/owner/laporan/umur-hutang', '/owner/laporan/umur-piutang',
  '/owner/marketplace', '/owner/materials', '/owner/products', '/owner/staff', '/owner/suppliers',
  '/owner/suppliers/price-history', '/owner/tiktok', '/owner/tiktok/migrate',
  '/penjahit', '/penjahit/history', '/penjahit/jobs', '/penjahit/reports'
]

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // Tangkap console error + request failed + response 4xx/5xx
  const consoleErrors = []
  const requestFailures = []
  const responseErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 150))
  })
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 150)))
  page.on('requestfailed', (req) => requestFailures.push(req.url().slice(0, 120) + ' :: ' + (req.failure()?.errorText || '')))
  page.on('response', (res) => {
    if (res.status() >= 400) responseErrors.push(res.status() + ' ' + res.url().slice(0, 120))
  })

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"], input[name="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"], button:has-text("Masuk")'),
  ])
  await page.waitForTimeout(2000)
  const loggedInUrl = page.url()
  console.log('LOGIN OK ->', loggedInUrl)

  // Helper: clear per-page buffers
  const clear = () => { consoleErrors.length = 0; requestFailures.length = 0; responseErrors.length = 0 }

  const results = []
  for (const p of PAGES) {
    clear()
    const t0 = Date.now()
    let status = 0, finalUrl = '', h1 = '', boundary = false
    try {
      const resp = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 20000 })
      status = resp ? resp.status() : 0
      finalUrl = page.url()
      // tunggu client-side fetch selesai
      await page.waitForTimeout(3500)
      h1 = (await page.$eval('h1', (el) => el.textContent.trim().slice(0, 45)).catch(() => ''))
      const body = (await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => ''))
      boundary = body.includes('Application error') || body.includes('Internal Server Error') || body.includes('digest:')
    } catch (e) {
      finalUrl = 'ERR: ' + String(e).slice(0, 80)
    }
    const ms = Date.now() - t0
    const toLogin = finalUrl.includes('/login')
    const problem = status >= 400 || boundary || toLogin || consoleErrors.length > 0 || requestFailures.length > 0 || responseErrors.length > 0 || !h1
    results.push({
      p, status, ms, finalUrl: finalUrl.replace(BASE, ''), h1: h1 || null,
      boundary, toLogin,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
      requestFailures: [...new Set(requestFailures)].slice(0, 5),
      responseErrors: [...new Set(responseErrors)].slice(0, 5),
      problem,
    })
    const tag = problem ? '!!' : 'ok'
    console.log(`${tag} ${status} ${ms}ms ${p}${consoleErrors.length ? ' [console:' + consoleErrors.length + ']' : ''}`)
  }

  await browser.close()

  const problems = results.filter((r) => r.problem)
  const out = { total: results.length, ok: results.length - problems.length, problems }
  require('fs').writeFileSync('scripts/_qa_result.json', JSON.stringify(out, null, 2))
  console.log('\n===== HASIL =====')
  console.log(`Total: ${out.total} | OK: ${out.ok} | MASALAH: ${problems.length}`)
  for (const r of problems) {
    console.log('\n' + r.p, r.status, r.ms + 'ms', '->', r.finalUrl, r.h1 ? '' : 'NO-H1')
    if (r.consoleErrors.length) console.log('  console:', r.consoleErrors.join(' | '))
    if (r.responseErrors.length) console.log('  resp>=400:', r.responseErrors.join(' | '))
    if (r.requestFailures.length) console.log('  failed:', r.requestFailures.join(' | '))
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1) })

// Audit CMS v2: render SEMUA halaman per role (route persis dari NAV_BY_ROLE + sub-halaman)
const { chromium } = require('playwright')

const ROLE_PAGES = {
  admin: ['/admin', '/admin/catalog', '/admin/catalog/products', '/admin/catalog/categories', '/admin/catalog/banners', '/admin/orders', '/admin/customers', '/admin/booking', '/admin/portfolio', '/admin/reports', '/admin/staff', '/admin/shipping', '/admin/laundry', '/admin/landing-settings', '/admin/seo'],
  gudang: ['/gudang', '/gudang/production', '/gudang/steam', '/gudang/qc', '/gudang/stock', '/gudang/stock/opname', '/gudang/alerts', '/gudang/lembur', '/gudang/reports'],
  penjahit: ['/penjahit', '/penjahit/jobs', '/penjahit/reports', '/penjahit/history'],
  finance: ['/finance', '/finance/accounts', '/finance/accounts/accounts', '/finance/accounts/categories', '/finance/accounts/mapping', '/finance/hutang', '/finance/hutang/proses', '/finance/hutang/retur', '/finance/piutang', '/finance/piutang/channel', '/finance/piutang/faktur', '/finance/piutang/payment', '/finance/piutang/process', '/finance/piutang/retur', '/finance/cash', '/finance/cash/mutation', '/finance/cash/income', '/finance/cash/expense', '/finance/cash/transfer', '/finance/assets', '/finance/journal', '/finance/journal/auto', '/finance/payments', '/finance/laundry-payroll', '/finance/laporan', '/finance/laporan/neraca', '/finance/laporan/laba-rugi', '/finance/laporan/buku-besar', '/finance/laporan/daftar-jurnal', '/finance/laporan/mutasi-kas', '/finance/laporan/umur-hutang', '/finance/laporan/umur-piutang', '/finance/laporan/performa-tag', '/finance/laporan/kronologi-hpp', '/finance/settings'],
  installer: ['/installer', '/installer/reports', '/installer/schedule', '/installer/checklist'],
  owner: ['/owner', '/owner/dashboard', '/admin/orders', '/admin/shipping', '/owner/materials', '/owner/hpp', '/owner/suppliers', '/owner/suppliers/price-history', '/gudang/stock', '/owner/staff', '/owner/marketplace', '/owner/tiktok', '/owner/tiktok/migrate', '/owner/products', '/owner/laporan', '/owner/laporan/neraca', '/owner/laporan/laba-rugi', '/owner/laporan/buku-besar', '/owner/laporan/daftar-jurnal', '/owner/laporan/mutasi-kas', '/owner/laporan/umur-hutang', '/owner/laporan/umur-piutang', '/owner/laporan/performa-tag', '/owner/laporan/kronologi-hpp']
}

const CREDS = {
  admin: ['qa.admin.1785643503918@hermes.local', 'QaTest123!'],
  finance: ['qa.finance.1785643504650@hermes.local', 'QaTest123!'],
  gudang: ['qa.gudang.1785643504940@hermes.local', 'QaTest123!'],
  penjahit: ['qa.penjahit.1785643505176@hermes.local', 'QaTest123!'],
  installer: ['qa.installer.1785643505395@hermes.local', 'QaTest123!'],
  owner: ['qa.owner.1785643505609@hermes.local', 'QaTest123!']
}

async function main() {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  let total = 0, okCount = 0, blocked = 0, errors = 0
  for (const [role, pages] of Object.entries(ROLE_PAGES)) {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } })
    const errs = []
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push('C:' + m.text().slice(0, 120)) })
    page.on('pageerror', (e) => errs.push('P:' + e.message.slice(0, 120)))
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('_next') && !r.url().includes('favicon')) errs.push('H' + r.status() + ':' + r.url().slice(0, 85)) })
    await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(500)
    await page.fill('input[type=email], input[name=email]', CREDS[role][0]).catch(() => {})
    await page.fill('input[type=password]', 'QaTest123!')
    await page.click('button[type=submit]')
    await page.waitForTimeout(2500)
    console.log('\n===== ' + role.toUpperCase() + ' (' + pages.length + ' halaman) =====')
    for (const p of pages) {
      total++
      errs.length = 0
      await page.goto('http://localhost:3100' + p, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {})
      await page.waitForTimeout(1000)
      const url = page.url().replace('http://localhost:3100', '')
      if (!url.includes(p)) {
        blocked++
        console.log('  ⛔ ' + p + ' → ' + url)
      } else if (errs.length) {
        errors++
        console.log('  ⚠️  ' + p + ' (' + errs.length + ')')
        errs.slice(0, 3).forEach((e) => console.log('      ' + e))
      } else {
        okCount++
        console.log('  ✅ ' + p)
      }
    }
    await page.close()
  }
  await b.close()
  console.log('\n========== SUMMARY ==========')
  console.log('Total:', total, '| OK:', okCount, '| Error:', errors, '| Blocked:', blocked)
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })

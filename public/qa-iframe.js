// QA render nyata menyeluruh — dijalankan dari browser console (localhost:3100)
// Render tiap halaman di iframe tersembunyi, tangkap JS error + network 4xx/5xx + error boundary.
(function () {
  if (window.__qaRunning) return 'already running'
  window.__qaRunning = true
  window.__qaJsErrors = []
  window.addEventListener('error', (e) => {
    window.__qaJsErrors.push((e.message || 'unknown').slice(0, 120))
  }, true)
  window.addEventListener('unhandledrejection', (e) => {
    window.__qaJsErrors.push('REJ: ' + String(e.reason).slice(0, 120))
  }, true)

  var PAGES = [
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

  var results = []
  var idx = 0

  function next() {
    if (idx >= PAGES.length) {
      var problems = results.filter(function (r) { return r.problem })
      window.__qaResult = {
        done: true, total: results.length,
        ok: results.length - problems.length,
        problems: problems,
        jsErrors: window.__qaJsErrors
      }
      window.__qaRunning = false
      return
    }
    var p = PAGES[idx++]
    var f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:700px;border:0;'
    document.body.appendChild(f)
    var settled = false
    function finish(note) {
      if (settled) return
      settled = true
      try {
        var w = f.contentWindow
        var bad = w.performance.getEntriesByType('resource')
          .filter(function (r) { return r.responseStatus >= 400 })
          .map(function (r) { return r.name.slice(-90) + ':' + r.responseStatus })
        var h1 = null
        try { h1 = w.document.querySelector('h1') ? w.document.querySelector('h1').textContent.slice(0, 45) : null } catch (e) {}
        var body = ''
        try { body = (w.document.body.innerText || '').slice(0, 150) } catch (e) {}
        var boundary = body.indexOf('Application error') >= 0 || body.indexOf('Internal Server Error') >= 0 || body.indexOf('digest:') >= 0
        var problem = bad.length > 0 || boundary || !h1
        results.push({ p: p, h1: h1, bad: bad, boundary: boundary, problem: problem, note: note || '' })
      } catch (e) {
        results.push({ p: p, h1: 'ERR:' + e.message.slice(0, 60), bad: [], boundary: false, problem: true, note: note || '' })
      }
      f.remove()
      setTimeout(next, 250)
    }
    f.onload = function () { setTimeout(finish, 2800) }
    setTimeout(function () { finish('timeout') }, 9000)
    f.src = p
  }
  next()
  return 'qa started: ' + PAGES.length + ' pages'
})()

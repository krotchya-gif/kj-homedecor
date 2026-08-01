// Verifikasi cepat halaman yang difix (QA ulang)
const { chromium } = require('playwright')
const BASE = 'http://localhost:3100'
const EMAIL = 'qa.test.kj@hermes.local'
const PASSWORD = 'QaTest123!'
const PAGES = ['/catalog', '/admin/reports', '/finance/journal/reports/cogs-chronology', '/finance/laporan/kronologi-hpp', '/owner/laporan/kronologi-hpp', '/finance/piutang/payment', '/admin/laundry', '/finance/laundry-payroll']

;(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  const responseErrors = []
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120)) })
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + String(err).slice(0, 120)))
  page.on('response', (res) => { if (res.status() >= 400) responseErrors.push(res.status() + ' ' + res.url().slice(0, 110)) })

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"], input[name="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"], button:has-text("Masuk")'),
  ])
  await page.waitForTimeout(2000)

  for (const p of PAGES) {
    consoleErrors.length = 0; responseErrors.length = 0
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(3500)
    const h1 = (await page.$eval('h1', (el) => el.textContent.trim().slice(0, 45)).catch(() => ''))
    console.log(JSON.stringify({ p, h1, consoleErrors: [...new Set(consoleErrors)], responseErrors: [...new Set(responseErrors)] }))
  }
  await browser.close()
})().catch((e) => { console.error('FATAL:', e); process.exit(1) })

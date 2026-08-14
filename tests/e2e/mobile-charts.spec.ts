import { test, expect, devices } from '@playwright/test'
import path from 'path'

// Verifikasi temporer (sesi 50): chart recharts harus render di viewport mobile.
const AUTH = path.join(__dirname, '.auth')
const iphone = devices['iPhone 12']

test('mobile: charts render di dashboard admin/finance/owner', async ({ browser }) => {
  const cases = [
    { role: 'admin', url: '/admin' },
    { role: 'finance', url: '/finance' },
    { role: 'owner', url: '/owner' }
  ]
  for (const c of cases) {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH, `${c.role}.json`),
      viewport: iphone.viewport,
      userAgent: iphone.userAgent,
      isMobile: true,
      hasTouch: true
    })
    const page = await ctx.newPage()
    await page.goto(c.url)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const count = await page.locator('.recharts-wrapper svg').count()
    const widths = count > 0 ? await page.locator('.recharts-wrapper svg').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width)) : []
    console.log(`${c.role} ${c.url}: svg=${count} widths=${JSON.stringify(widths)}`)
    expect(count, `${c.url} harus render chart`).toBeGreaterThan(0)
    for (const w of widths) expect(w, `${c.url} width chart`).toBeGreaterThan(100)
    await page.screenshot({ path: `C:/Users/okkyh/AppData/Local/Temp/opencode/mobile-${c.role}.png` })
    await ctx.close()
  }
})

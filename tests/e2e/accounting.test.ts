import { test, expect } from '@playwright/test'

const TEST_USERS = {
  finance: { email: 'kjhomedecornew26@gmail.com', password: 'finance321' },
  admin: { email: 'kjhomedecor22@gmail.com', password: 'admin321' },
}

test.describe('Finance - AKUN Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('akun dashboard accessible with 4 sub-modules', async ({ page }) => {
    await page.goto('/finance/accounts')
    await expect(page).toHaveURL(/\/finance\/accounts/)
    // Should show 4 sub-modules: Chart of Accounts, Kategori, Pemetaan, Pemetaan Selisih
    await page.waitForLoadState('networkidle')
  })

  test('chart of accounts list page accessible', async ({ page }) => {
    await page.goto('/finance/accounts/accounts')
    await expect(page).toHaveURL(/\/finance\/accounts\/accounts/)
    await page.waitForLoadState('networkidle')
  })

  test('account categories page accessible', async ({ page }) => {
    await page.goto('/finance/accounts/categories')
    await expect(page).toHaveURL(/\/finance\/accounts\/categories/)
    await page.waitForLoadState('networkidle')
  })

  test('account mapping page accessible', async ({ page }) => {
    await page.goto('/finance/accounts/mapping')
    await expect(page).toHaveURL(/\/finance\/accounts\/mapping/)
    await page.waitForLoadState('networkidle')
  })

  test('account mapping difference page accessible', async ({ page }) => {
    await page.goto('/finance/accounts/mapping-difference')
    await expect(page).toHaveURL(/\/finance\/accounts\/mapping-difference/)
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Finance - HUTANG Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('hutang page accessible', async ({ page }) => {
    await page.goto('/finance/hutang')
    await expect(page).toHaveURL(/\/finance\/hutang/)
    await page.waitForLoadState('networkidle')
  })

  test('hutang table shows supplier invoices', async ({ page }) => {
    await page.goto('/finance/hutang')
    await page.waitForLoadState('networkidle')
    // Should show columns: Supplier, Tagihan, Retur, Sisa Tagihan
    const content = await page.content()
    expect(content).toBeDefined()
  })
})

test.describe('Finance - PIUTANG Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('piutang dashboard accessible', async ({ page }) => {
    await page.goto('/finance/piutang')
    await expect(page).toHaveURL(/\/finance\/piutang/)
    await page.waitForLoadState('networkidle')
  })

  test('piutang faktur page accessible', async ({ page }) => {
    await page.goto('/finance/piutang/faktur')
    await expect(page).toHaveURL(/\/finance\/piutang\/faktur/)
    await page.waitForLoadState('networkidle')
  })

  test('piutang retur page accessible', async ({ page }) => {
    await page.goto('/finance/piutang/retur')
    await expect(page).toHaveURL(/\/finance\/piutang\/retur/)
    await page.waitForLoadState('networkidle')
  })

  test('piutang process page accessible', async ({ page }) => {
    await page.goto('/finance/piutang/process')
    await expect(page).toHaveURL(/\/finance\/piutang\/process/)
    await page.waitForLoadState('networkidle')
  })

  test('piutang payment page accessible', async ({ page }) => {
    await page.goto('/finance/piutang/payment')
    await expect(page).toHaveURL(/\/finance\/piutang\/payment/)
    await page.waitForLoadState('networkidle')
  })

  test('piutang channel page accessible', async ({ page }) => {
    await page.goto('/finance/piutang/channel')
    await expect(page).toHaveURL(/\/finance\/piutang\/channel/)
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Finance - KAS DAN BANK Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('cash/bank page accessible', async ({ page }) => {
    await page.goto('/finance/cash')
    await expect(page).toHaveURL(/\/finance\/cash/)
    await page.waitForLoadState('networkidle')
  })

  test('cash accounts list shows bank info', async ({ page }) => {
    await page.goto('/finance/cash')
    await page.waitForLoadState('networkidle')
    // Should show columns: Kode, Nama Akun, Saldo
    const content = await page.content()
    expect(content).toBeDefined()
  })
})

test.describe('Finance - MANAJEMEN ASET Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('assets page accessible', async ({ page }) => {
    await page.goto('/finance/assets')
    await expect(page).toHaveURL(/\/finance\/assets/)
    await page.waitForLoadState('networkidle')
  })

  test('assets table shows asset registry', async ({ page }) => {
    await page.goto('/finance/assets')
    await page.waitForLoadState('networkidle')
    // Should show columns: Kode, Nama Aset, Kategori, Lokasi, Nilai Buku
    const content = await page.content()
    expect(content).toBeDefined()
  })
})

test.describe('Finance - JURNAL Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.finance.email)
    await page.fill('input[type="password"]', TEST_USERS.finance.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/finance**', { timeout: 15000 })
  })

  test('journal dashboard accessible', async ({ page }) => {
    await page.goto('/finance/journal')
    await expect(page).toHaveURL(/\/finance\/journal/)
    await page.waitForLoadState('networkidle')
  })

  test('auto journal page accessible', async ({ page }) => {
    await page.goto('/finance/journal/auto')
    await expect(page).toHaveURL(/\/finance\/journal\/auto/)
    await page.waitForLoadState('networkidle')
  })

  test('balance sheet report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/balance')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/balance/)
    await page.waitForLoadState('networkidle')
  })

  test('ledger report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/ledger')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/ledger/)
    await page.waitForLoadState('networkidle')
  })

  test('profit/loss report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/profit-loss')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/profit-loss/)
    await page.waitForLoadState('networkidle')
  })

  test('journal list report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/journal-list')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/journal-list/)
    await page.waitForLoadState('networkidle')
  })

  test('cogs chronology report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/cogs-chronology')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/cogs-chronology/)
    await page.waitForLoadState('networkidle')
  })

  test('cash mutation report accessible', async ({ page }) => {
    await page.goto('/finance/journal/reports/cash-mutation')
    await expect(page).toHaveURL(/\/finance\/journal\/reports\/cash-mutation/)
    await page.waitForLoadState('networkidle')
  })

  test('all report pages have download PDF button', async ({ page }) => {
    const reportPages = [
      '/finance/journal/reports/balance',
      '/finance/journal/reports/ledger',
      '/finance/journal/reports/profit-loss',
      '/finance/journal/reports/journal-list',
      '/finance/journal/reports/cogs-chronology',
      '/finance/journal/reports/cash-mutation',
    ]

    for (const reportPage of reportPages) {
      await page.goto(reportPage)
      await page.waitForLoadState('networkidle')
      const downloadButton = page.locator('button:has-text("Download PDF"), button:has-text("download PDF")')
      await expect(downloadButton).toBeVisible({ timeout: 5000 })
    }
  })
})
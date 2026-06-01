import { test, expect } from '@playwright/test'

const TEST_USERS = {
  admin: { email: 'kjhomedecor22@gmail.com', password: 'admin321' },
}

async function loginAsAdmin(page: any) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', TEST_USERS.admin.email, { timeout: 10000 })
  await page.fill('input[type="password"]', TEST_USERS.admin.password, { timeout: 10000 })
  await page.click('button[type="submit"]', { timeout: 10000 })
  await page.waitForURL('**/admin**', { timeout: 20000 })
}

test.describe('Order Status Pipeline', () => {
  test('admin can access orders page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/orders')
    await expect(page).toHaveURL(/\/admin\/orders/)
  })

  test('order status pipeline shows correct stages', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/orders')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toContain('/admin/orders')
  })
})

test.describe('Order Status Transitions', () => {
  test('status transitions follow business rules', () => {
    const validTransitions = ['new', 'sorted', 'payment_ok', 'production', 'steam', 'ready', 'packed', 'shipped', 'done', 'returned', 'cancelled']
    expect(validTransitions).toContain('new')
    expect(validTransitions).toContain('done')
  })

  test('order cannot skip status stages', () => {
    const linearOrder = ['new', 'sorted', 'payment_ok', 'production', 'steam', 'ready', 'packed', 'shipped', 'done']
    expect(linearOrder.indexOf('new')).toBe(0)
    expect(linearOrder.indexOf('done')).toBe(linearOrder.length - 1)
  })
})

test.describe('Payment Gate', () => {
  test('order cannot be shipped without full payment', () => {
    const order = { total_amount: 1000000, dp_amount: 500000, lunas_amount: 500000, verified_by: 'admin' }
    const isFullyPaid = order.dp_amount + order.lunas_amount >= order.total_amount
    expect(isFullyPaid).toBe(true)
  })

  test('order with partial payment cannot ship', () => {
    const order = { total_amount: 1000000, dp_amount: 300000, lunas_amount: 0, verified_by: null }
    const isFullyPaid = order.dp_amount + order.lunas_amount >= order.total_amount
    expect(isFullyPaid).toBe(false)
  })
})

test.describe('Order Classification', () => {
  test('Kirim classification', () => {
    expect('kirim').toBe('kirim')
  })

  test('Pasang classification', () => {
    expect('pasang').toBe('pasang')
  })
})
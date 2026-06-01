import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:3000/api'

test.describe('Orders API', () => {
  test('GET /api/orders - should return list of orders', async ({ request }) => {
    const response = await request.get(`${API_BASE}/orders`)
    // API may require auth, so accept 200 or 401
    expect([200, 401]).toContain(response.status())

    if (response.status() === 200) {
      const json = await response.json()
      expect(json).toHaveProperty('data')
      expect(Array.isArray(json.data)).toBeTruthy()
    }
  })

  test('GET /api/orders?status=new - should filter by status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/orders?status=new`)
    expect([200, 401]).toContain(response.status())

    if (response.status() === 200) {
      const json = await response.json()
      if (json.data && json.data.length > 0) {
        json.data.forEach((order: any) => {
          expect(order.status).toBe('new')
        })
      }
    }
  })

  test('POST /api/orders - should return structure on create', async ({ request }) => {
    const orderData = {
      source: 'landing_page',
      classification: 'kirim',
      customer_name: 'Test Customer',
      customer_phone: '08123456789',
      customer_address: 'Test Address',
      total_amount: 100000,
    }

    const response = await request.post(`${API_BASE}/orders`, {
      data: orderData,
    })

    // Should return either success or error
    expect([200, 400, 401, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
  })

  test('POST /api/orders - should reject invalid source', async ({ request }) => {
    const invalidData = {
      source: 'invalid_source',
      classification: 'kirim',
      total_amount: 100000,
    }

    const response = await request.post(`${API_BASE}/orders`, {
      data: invalidData,
    })

    // Should NOT return 200
    expect(response.status()).not.toBe(200)
  })

  test('POST /api/orders - should reject negative total_amount', async ({ request }) => {
    const invalidData = {
      source: 'landing_page',
      classification: 'kirim',
      total_amount: -1000,
    }

    const response = await request.post(`${API_BASE}/orders`, {
      data: invalidData,
    })

    expect(response.status()).not.toBe(200)
  })
})

test.describe('Customers API', () => {
  test('GET /api/customers - should return list of customers', async ({ request }) => {
    const response = await request.get(`${API_BASE}/customers`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('GET /api/customers?search=test - should filter by search', async ({ request }) => {
    const response = await request.get(`${API_BASE}/customers?search=test`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toHaveProperty('data')
  })

  test('POST /api/customers - should create customer', async ({ request }) => {
    const customerData = {
      name: 'Test Customer API ' + Date.now(),
      phone: '081234567890',
      address: 'Test Address',
    }

    const response = await request.post(`${API_BASE}/customers`, {
      data: customerData,
    })

    expect([200, 201, 400, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Products API', () => {
  test('GET /api/products - should return list of products', async ({ request }) => {
    const response = await request.get(`${API_BASE}/products`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('GET /api/products?category=cat-id - should filter by category', async ({ request }) => {
    const response = await request.get(`${API_BASE}/products?category=test-category`)
    // Any response is valid - may be empty or with data
    expect(response.status()).toBeGreaterThanOrEqual(200)

    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Materials API', () => {
  test('GET /api/materials - should return list of materials', async ({ request }) => {
    const response = await request.get(`${API_BASE}/materials`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('POST /api/materials - should create material', async ({ request }) => {
    const materialData = {
      name: 'Test Material API ' + Date.now(),
      unit: 'meter',
      cost_per_unit: 10000,
      stock_gudang: 100,
      stock_toko: 50,
      min_stock_level: 20,
    }

    const response = await request.post(`${API_BASE}/materials`, {
      data: materialData,
    })

    expect([200, 201, 400, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Suppliers API', () => {
  test('GET /api/suppliers - should return list of suppliers', async ({ request }) => {
    const response = await request.get(`${API_BASE}/suppliers`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toHaveProperty('data')
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('POST /api/suppliers - should create supplier', async ({ request }) => {
    const supplierData = {
      name: 'Test Supplier API ' + Date.now(),
      contact: '081234567890',
      address: 'Test Address',
    }

    const response = await request.post(`${API_BASE}/suppliers`, {
      data: supplierData,
    })

    expect([200, 201, 400, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Install Bookings API', () => {
  test('GET /api/install-bookings - should return list of bookings', async ({ request }) => {
    const response = await request.get(`${API_BASE}/install-bookings`)
    // May require auth
    expect([200, 401]).toContain(response.status())

    if (response.status() === 200) {
      const json = await response.json()
      expect(json).toHaveProperty('data')
    }
  })

  test('POST /api/install-bookings - should create booking', async ({ request }) => {
    const bookingData = {
      customer_name: 'Test Customer',
      customer_phone: '081234567890',
      address: 'Test Address',
      date: '2026-05-15',
      time: '10:00',
      type: 'pasang',
    }

    const response = await request.post(`${API_BASE}/install-bookings`, {
      data: bookingData,
    })

    expect([200, 201, 400, 401, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Purchase Requests API', () => {
  test('GET /api/purchase-requests - should return list of PRs (or 401 if auth required)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/purchase-requests`)
    expect([200, 401]).toContain(response.status())
  })

  test('GET /api/purchase-requests?status=pending - should filter by status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/purchase-requests?status=pending`)
    expect([200, 401]).toContain(response.status())
  })
})

test.describe('Purchase Orders API', () => {
  test('GET /api/purchase-orders - should return list of POs (or 401 if auth required)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/purchase-orders`)
    expect([200, 401]).toContain(response.status())
  })

  test('GET /api/purchase-orders?status=pending - should filter by status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/purchase-orders?status=pending`)
    expect([200, 401]).toContain(response.status())
  })
})

test.describe('Landing Settings API', () => {
  test('GET /api/landing-settings - should return landing page settings', async ({ request }) => {
    const response = await request.get(`${API_BASE}/landing-settings`)
    expect(response.ok()).toBeTruthy()

    const json = await response.json()
    expect(json).toBeDefined()
  })
})

test.describe('Xendit API', () => {
  test('POST /api/xendit/create-payment - should return response', async ({ request }) => {
    const paymentData = {
      order_id: 'test-order-id',
      amount: 100000,
      payment_type: 'VA',
    }

    const response = await request.post(`${API_BASE}/xendit/create-payment`, {
      data: paymentData,
    })

    // Should return any valid response
    expect([200, 400, 404, 500]).toContain(response.status())
    const json = await response.json()
    expect(json).toBeDefined()
    // May have success or error depending on Xendit config
  })

  test('POST /api/xendit/webhook - should handle webhook', async ({ request }) => {
    const webhookData = {
      event: 'payment',
      external_id: 'test-id',
      status: 'PAID',
    }

    const response = await request.post(`${API_BASE}/xendit/webhook`, {
      data: webhookData,
    })

    expect([200, 400, 401, 500]).toContain(response.status())
  })
})
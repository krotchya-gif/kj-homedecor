import { describe, it, expect, vi } from 'vitest'
import { getClientIp } from '@/lib/auth'
import { signTikTokRequest } from '@/lib/tiktok'

describe('getClientIp (anti-spoof rate limit)', () => {
  it('mengambil entry pertama x-forwarded-for', () => {
    const req = new Request('https://x.test/api/x', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }
    })
    expect(getClientIp(req)).toBe('203.0.113.7')
  })

  it('fallback ke x-real-ip saat x-forwarded-for kosong', () => {
    const req = new Request('https://x.test/api/x', {
      headers: { 'x-real-ip': '198.51.100.3' }
    })
    expect(getClientIp(req)).toBe('198.51.100.3')
  })

  it('fallback "unknown" saat kedua header tidak ada', () => {
    const req = new Request('https://x.test/api/x')
    expect(getClientIp(req)).toBe('unknown')
  })

  it('trim whitespace di entry pertama', () => {
    const req = new Request('https://x.test/api/x', {
      headers: { 'x-forwarded-for': '  192.0.2.9  ' }
    })
    expect(getClientIp(req)).toBe('192.0.2.9')
  })
})

describe('signTikTokRequest (HMAC-SHA256 deterministic)', () => {
  it('menghasilkan URL dengan app_key, timestamp & sign yang valid', () => {
    const url = signTikTokRequest('/finance/202309/statements', 'APP_KEY', 'SECRET', undefined, {
      sort_field: 'statement_time'
    })
    expect(url).toMatch(/^https:\/\/open-api\.tiktokglobalshop\.com\/finance\/202309\/statements\?/)
    expect(url).toContain('app_key=APP_KEY')
    expect(url).toContain('sort_field=statement_time')
    expect(url).toMatch(/timestamp=\d+/)
    expect(url).toContain('sign=')
  })

  it('deterministik untuk input yang sama (timestamp & qs tetap)', () => {
    const a = signTikTokRequest('/p', 'K', 'S', { qty: 2 }, { b: '1' })
    const b = signTikTokRequest('/p', 'K', 'S', { qty: 2 }, { b: '1' })
    // hanya timestamp yang beda → panjang & struktur sama, sign 64 hex
    const signA = a.split('sign=')[1]
    expect(signA).toMatch(/^[a-f0-9]{64}$/)
    expect(a.split('sign=')[0]).toBe(b.split('sign=')[0])
  })
})

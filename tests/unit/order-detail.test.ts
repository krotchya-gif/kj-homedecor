import { describe, it, expect } from 'vitest'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter, parseGordenSize, calcKainGorden, getOrderLogAction, DEFAULT_CHECKLIST } from '@/lib/order-detail'

describe('canRoleAdvanceNext', () => {
  it('owner = escape hatch, boleh semua stage', () => {
    expect(canRoleAdvanceNext('owner', 'new')).toBe(true)
    expect(canRoleAdvanceNext('owner', 'done')).toBe(true)
    expect(canRoleAdvanceNext('owner', 'shipped')).toBe(true)
  })

  it('role hanya bisa di stage tanggung jawabnya', () => {
    expect(canRoleAdvanceNext('finance', 'new')).toBe(true)
    expect(canRoleAdvanceNext('finance', 'production')).toBe(false)
    expect(canRoleAdvanceNext('gudang', 'payment_ok')).toBe(true)
    expect(canRoleAdvanceNext('gudang', 'sorted')).toBe(true)
    expect(canRoleAdvanceNext('gudang', 'steam')).toBe(true)
    expect(canRoleAdvanceNext('gudang', 'new')).toBe(false)
    expect(canRoleAdvanceNext('installer', 'packed')).toBe(true)
    expect(canRoleAdvanceNext('installer', 'shipped')).toBe(true)
  })

  it('penjahit tidak boleh advance di order detail', () => {
    expect(canRoleAdvanceNext('penjahit', 'production')).toBe(false)
    expect(canRoleAdvanceNext('penjahit', 'steam')).toBe(false)
  })

  it('role tidak dikenal → deny', () => {
    expect(canRoleAdvanceNext('unknown', 'new')).toBe(false)
  })
})

describe('getResponsibleRoles', () => {
  it('mencakup owner selalu (escape hatch)', () => {
    expect(getResponsibleRoles('new')).toContain('owner')
    expect(getResponsibleRoles('shipped')).toContain('owner')
  })

  it('mencakup role penanggung jawab stage', () => {
    expect(getResponsibleRoles('new')).toContain('finance')
    expect(getResponsibleRoles('payment_ok')).toContain('gudang')
    expect(getResponsibleRoles('packed')).toContain('installer')
    expect(getResponsibleRoles('shipped')).toContain('installer')
  })
})

describe('parseGordenSize (BUG-148)', () => {
  it('pecah "lebar x tinggi" → cm', () => {
    expect(parseGordenSize('120 x 250')).toEqual({ lebarCm: 120, tinggiCm: 250 })
    expect(parseGordenSize('240x300')).toEqual({ lebarCm: 240, tinggiCm: 300 })
    expect(parseGordenSize('150 × 200')).toEqual({ lebarCm: 150, tinggiCm: 200 })
  })

  it('mengembalikan {0,0} untuk format tidak valid', () => {
    expect(parseGordenSize('')).toEqual({ lebarCm: 0, tinggiCm: 0 })
    expect(parseGordenSize('250')).toEqual({ lebarCm: 0, tinggiCm: 0 })
  })
})

describe('calcKainGorden (BUG-148)', () => {
  it('tinggi ≤ 250cm → Lebar(m) × faktor', () => {
    expect(calcKainGorden(200, 250, 2.5)).toBe(5)
    expect(calcKainGorden(120, 200, 3)).toBe(3.6)
  })

  it('tepat 250cm belum kena sambungan, 251cm kena', () => {
    expect(calcKainGorden(200, 250, 2.5)).toBe(5)
    expect(calcKainGorden(200, 251, 2.5)).toBe(7.5)
  })

  it('tinggi > 250cm → 1.5 × Lebar × faktor (sambungan)', () => {
    expect(calcKainGorden(240, 300, 3)).toBe(10.8)
    expect(calcKainGorden(100, 260, 2.5)).toBe(3.75)
  })

  it('input tidak valid → 0', () => {
    expect(calcKainGorden(0, 250, 2.5)).toBe(0)
    expect(calcKainGorden(200, 0, 2.5)).toBe(0)
    expect(calcKainGorden(200, 250, 0)).toBe(0)
    expect(calcKainGorden(NaN, 250, 2.5)).toBe(0)
    expect(calcKainGorden(-100, 250, 2.5)).toBe(0)
  })
})

describe('parseGordenMeter', () => {
  it('parse "lebar x tinggi" → meter (tinggi/100)', () => {
    expect(parseGordenMeter('120 x 250')).toBe(2.5)
    expect(parseGordenMeter('100x200')).toBe(2)
    expect(parseGordenMeter('150 × 300')).toBe(3)
  })

  it('mengembalikan 0 untuk format tidak valid', () => {
    expect(parseGordenMeter('')).toBe(0)
    expect(parseGordenMeter('gorden panjang')).toBe(0)
    expect(parseGordenMeter('250')).toBe(0)
  })
})

describe('getOrderLogAction (Phase 6B-1)', () => {
  it('memetakan status → action log yang valid utk constraint chk_action', () => {
    expect(getOrderLogAction('new')).toBe('created')
    expect(getOrderLogAction('payment_ok')).toBe('payment_verified')
    expect(getOrderLogAction('sorted')).toBe('sorted')
    expect(getOrderLogAction('production')).toBe('production_started')
    expect(getOrderLogAction('steam')).toBe('steam_qc_pass')
    expect(getOrderLogAction('ready')).toBe('qc_pass')
    expect(getOrderLogAction('packed')).toBe('packed')
    expect(getOrderLogAction('shipped')).toBe('shipped')
    expect(getOrderLogAction('done')).toBe('done')
    expect(getOrderLogAction('cancelled')).toBe('cancelled')
  })

  it('status tak dikenal → fallback status_changed (jangan pakai status mentah)', () => {
    expect(getOrderLogAction('scheduled')).toBe('status_changed')
    expect(getOrderLogAction('installing')).toBe('status_changed')
    expect(getOrderLogAction('')).toBe('status_changed')
  })
})

describe('DEFAULT_CHECKLIST (Phase 6B-1)', () => {
  it('memuat 6 item persiapan default', () => {
    expect(DEFAULT_CHECKLIST).toHaveLength(6)
    expect(DEFAULT_CHECKLIST[0]).toMatchObject({ key: 'besi', done: false, notes: '' })
  })
})

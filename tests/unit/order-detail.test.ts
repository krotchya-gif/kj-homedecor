import { describe, it, expect } from 'vitest'
import { canRoleAdvanceNext, getResponsibleRoles, parseGordenMeter } from '@/lib/order-detail'

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

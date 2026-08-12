import { describe, it, expect } from 'vitest'
import {
  ORDER_STAGES_BY_CLASSIFICATION,
  PHOTO_REQUIRED_STAGES,
  getNextStage,
  isPhotoRequired,
  getNextStageButtonLabel
} from '@/lib/orders'

describe('ORDER_STAGES_BY_CLASSIFICATION', () => {
  it('kirim: berakhir di done dan memuat semua tahap', () => {
    const stages = ORDER_STAGES_BY_CLASSIFICATION.kirim
    expect(stages[0]).toBe('new')
    expect(stages[stages.length - 1]).toBe('done')
    expect(stages).toContain('payment_ok')
    expect(stages).toContain('packed')
    expect(stages).toContain('shipped')
  })

  it('pasang: berakhir di done dengan tahap installing', () => {
    const stages = ORDER_STAGES_BY_CLASSIFICATION.pasang
    expect(stages[stages.length - 1]).toBe('done')
    expect(stages).toContain('scheduled')
    expect(stages).toContain('installing')
    expect(stages).not.toContain('shipped')
  })

  it('urutan pipeline benar (payment gate di depan, done di akhir)', () => {
    expect(ORDER_STAGES_BY_CLASSIFICATION.kirim).toEqual([
      'new',
      'payment_ok',
      'sorted',
      'production',
      'steam',
      'ready',
      'packed',
      'shipped',
      'done'
    ])
    expect(ORDER_STAGES_BY_CLASSIFICATION.pasang).toEqual([
      'new',
      'payment_ok',
      'sorted',
      'production',
      'steam',
      'ready',
      'packed',
      'scheduled',
      'installing',
      'done'
    ])
  })
})

describe('getNextStage', () => {
  it('mengembalikan tahap berikutnya', () => {
    expect(getNextStage('new', 'kirim')).toBe('payment_ok')
    expect(getNextStage('steam', 'kirim')).toBe('ready')
    expect(getNextStage('packed', 'pasang')).toBe('scheduled')
    expect(getNextStage('packed', 'kirim')).toBe('shipped')
  })

  it('mengembalikan null di tahap terakhir', () => {
    expect(getNextStage('done', 'kirim')).toBeNull()
    expect(getNextStage('done', 'pasang')).toBeNull()
  })

  it('mengembalikan null untuk stage yang tidak dikenal', () => {
    expect(getNextStage('cancelled' as never, 'kirim')).toBeNull()
  })
})

describe('PHOTO_REQUIRED_STAGES / isPhotoRequired', () => {
  it('sorted, steam, shipped, scheduled wajib foto', () => {
    expect(PHOTO_REQUIRED_STAGES).toEqual(['sorted', 'steam', 'shipped', 'scheduled'])
    for (const s of PHOTO_REQUIRED_STAGES) {
      expect(isPhotoRequired(s)).toBe(true)
    }
  })

  it('stage lain tidak wajib foto', () => {
    expect(isPhotoRequired('new')).toBe(false)
    expect(isPhotoRequired('packed')).toBe(false)
    expect(isPhotoRequired('done')).toBe(false)
  })
})

describe('getNextStageButtonLabel', () => {
  it('label spesifik untuk transisi penting', () => {
    expect(getNextStageButtonLabel('new', 'kirim')).toBe('Approve Pembayaran')
    expect(getNextStageButtonLabel('packed', 'kirim')).toBe('Input Resi')
    expect(getNextStageButtonLabel('packed', 'pasang')).toBe('Jadwalkan Pasang')
    expect(getNextStageButtonLabel('ready', 'kirim')).toBe('QC Pass')
    expect(getNextStageButtonLabel('steam', 'kirim')).toBe('QC Pass')
    expect(getNextStageButtonLabel('sorted', 'kirim')).toBe('Mulai Produksi')
    expect(getNextStageButtonLabel('production', 'kirim')).toBe('Submit Report')
  })

  it('fallback "Lanjut" untuk transisi lain', () => {
    expect(getNextStageButtonLabel('shipped', 'kirim')).toBe('Lanjut')
    expect(getNextStageButtonLabel('installing', 'pasang')).toBe('Lanjut')
  })
})

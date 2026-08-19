'use client'

import { Palette, Check } from 'lucide-react'

export interface ThemePreset {
  id: string
  name: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
}

// Kombinasi warna diambil dari colorpalet.md (referensi palet landing page).
// Preset pertama ("Rosé Cokelat") = rekomendasi utama (default).
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Rosé Cokelat',
    description: 'Rekomendasi utama: lembut-feminin + netral tenang + bold rose',
    colors: {
      primary: '#F6C8CC',
      secondary: '#CAB6B1',
      accent: '#E7486A',
      background: '#EDEFF0',
      text: '#595F61'
    }
  },
  {
    id: 'tenang',
    name: 'Tenang',
    description: 'Sage hijau lembut dipadu biru muda yang kalem',
    colors: {
      primary: '#9ACBAA',
      secondary: '#C1DBED',
      accent: '#7BA388',
      background: '#F5F4F4',
      text: '#60806A'
    }
  },
  {
    id: 'lembut',
    name: 'Lembut',
    description: 'Nuansa pink lembut yang ramah dan hangat',
    colors: {
      primary: '#F7E6EB',
      secondary: '#E7B4C5',
      accent: '#DA7DA0',
      background: '#F5F4F4',
      text: '#BB567F'
    }
  },
  {
    id: 'sejuk',
    name: 'Sejuk',
    description: 'Biru sejuk & profesional dengan sentuhan segar',
    colors: {
      primary: '#C1DBED',
      secondary: '#81B8DC',
      accent: '#5D93B5',
      background: '#EDEFF0',
      text: '#2F4E62'
    }
  },
  {
    id: 'gelap-netral',
    name: 'Gelap Netral',
    description: 'Lat belakang gelap elegan dengan aksen wine',
    colors: {
      primary: '#445B4B',
      secondary: '#6E5E5E',
      accent: '#572439',
      background: '#191B1C',
      text: '#F5F4F4'
    }
  },
  {
    id: 'earthy',
    name: 'Hangat Earthy',
    description: 'Olive hangat & earthy untuk kesan alami',
    colors: {
      primary: '#F1DFA3',
      secondary: '#A4935A',
      accent: '#807245',
      background: '#F5F4F4',
      text: '#5B502F'
    }
  },
  {
    id: 'bold',
    name: 'Kontras Bold',
    description: 'Rose kontras tinggi yang berani menonjol',
    colors: {
      primary: '#E7486A',
      secondary: '#E0E5DA',
      accent: '#B33650',
      background: '#EDEFF0',
      text: '#48101C'
    }
  },
  {
    id: 'rose-premium',
    name: 'Rosé Premium',
    description: 'Aksen premium rosé & cokelat yang eksklusif',
    colors: {
      primary: '#EF8F9B',
      secondary: '#AF8D84',
      accent: '#8B6D66',
      background: '#F5F4F4',
      text: '#3B2D29'
    }
  }
]

interface ThemePresetCardProps {
  selectedPreset: string
  onSelectPreset: (preset: ThemePreset) => void
}

export default function ThemePresetCard({ selectedPreset, onSelectPreset }: ThemePresetCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--neutral-200)',
        borderRadius: '0.75rem',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--neutral-200)',
          background: 'var(--neutral-100)'
        }}
      >
        <h2
          style={{
            fontSize: '0.9rem',
            fontWeight: '700',
            color: 'var(--neutral-700)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Palette size={14} /> Theme Preset
        </h2>
      </div>
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        {THEME_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem',
                border: `2px solid ${isSelected ? '#cc7030' : 'var(--neutral-200)'}`,
                borderRadius: '0.5rem',
                background: isSelected ? 'var(--neutral-100)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--input-border)'
                  e.currentTarget.style.background = 'var(--neutral-100)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--neutral-200)'
                  e.currentTarget.style.background = 'var(--surface)'
                }
              }}
            >
              {/* Color swatches */}
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                {Object.values(preset.colors)
                  .slice(0, 3)
                  .map((color, i) => (
                    <div
                      key={i}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '0.25rem',
                        background: color,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--neutral-700)',
                    marginBottom: '0.125rem'
                  }}
                >
                  {preset.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--neutral-600)',
                    lineHeight: 1.4
                  }}
                >
                  {preset.description}
                </div>
              </div>

              {/* Check icon */}
              {isSelected && <Check size={18} style={{ color: '#cc7030', flexShrink: 0 }} />}
            </button>
          )
        })}

        {/* Info text */}
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--neutral-400)',
            marginTop: '0.5rem',
            lineHeight: 1.5
          }}
        >
          💡 Select a preset to auto-fill all color fields. You can customize individual colors after applying a preset.
        </p>
      </div>
    </div>
  )
}

// Made with Bob

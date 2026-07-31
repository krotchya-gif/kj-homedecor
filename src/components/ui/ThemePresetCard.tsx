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

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default Brown',
    description: 'Warm & elegant brown palette (KJ Homedecor original)',
    colors: {
      primary: '#DDC0B4',
      secondary: '#C9A98C',
      accent: '#f4a857',
      background: '#FAF5EE',
      text: '#2B2321'
    }
  },
  {
    id: 'modern',
    name: 'Modern Minimalis',
    description: 'Clean & professional dark gray with blue accent',
    colors: {
      primary: '#1f2937',
      secondary: '#374151',
      accent: '#3b82f6',
      background: '#f9fafb',
      text: '#111827'
    }
  },
  {
    id: 'gold',
    name: 'Elegant Gold',
    description: 'Luxurious gold & cream for premium feel',
    colors: {
      primary: '#d4af37',
      secondary: '#c5a572',
      accent: '#ffd700',
      background: '#fffef7',
      text: '#3d2f1f'
    }
  },
  {
    id: 'green',
    name: 'Fresh Green',
    description: 'Natural & eco-friendly green palette',
    colors: {
      primary: '#16a34a',
      secondary: '#22c55e',
      accent: '#86efac',
      background: '#f0fdf4',
      text: '#14532d'
    }
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Bold & creative purple for modern brands',
    colors: {
      primary: '#7c3aed',
      secondary: '#9333ea',
      accent: '#c084fc',
      background: '#faf5ff',
      text: '#581c87'
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
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}
      >
        <h2
          style={{
            fontSize: '0.9rem',
            fontWeight: '700',
            color: '#374151',
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
                border: `2px solid ${isSelected ? '#cc7030' : '#e5e7eb'}`,
                borderRadius: '0.5rem',
                background: isSelected ? '#fff5f0' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.background = '#f9fafb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.background = '#fff'
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
                    color: '#374151',
                    marginBottom: '0.125rem'
                  }}
                >
                  {preset.name}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#6b7280',
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
            fontSize: '0.72rem',
            color: '#9ca3af',
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

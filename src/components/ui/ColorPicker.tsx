'use client'

import { useState } from 'react'
import { Palette, RotateCcw } from 'lucide-react'

interface ColorPickerProps {
  label: string
  value: string
  defaultValue: string
  onChange: (color: string) => void
  description?: string
}

export default function ColorPicker({
  label,
  value,
  defaultValue,
  onChange,
  description,
}: ColorPickerProps) {
  const [isValid, setIsValid] = useState(true)

  const validateHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsValid(validateHex(newValue))
  }

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsValid(true)
  }

  const handleReset = () => {
    onChange(defaultValue)
    setIsValid(true)
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Color swatch + native picker */}
        <div style={{ position: 'relative' }}>
          <input
            type="color"
            value={isValid ? value : defaultValue}
            onChange={handleColorPickerChange}
            style={{
              width: 48,
              height: 48,
              border: '2px solid #d1d5db',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Pick a color"
          />
          <Palette
            size={14}
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              color: '#fff',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          />
        </div>

        {/* HEX input */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="#000000"
          maxLength={7}
          style={{
            flex: 1,
            padding: '0.625rem',
            border: `2px solid ${isValid ? '#d1d5db' : '#ef4444'}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        />

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          title="Reset to default"
          style={{
            padding: '0.625rem',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
        >
          <RotateCcw size={16} style={{ color: '#6b7280' }} />
        </button>
      </div>

      {/* Description or error */}
      {description && isValid && (
        <p
          style={{
            fontSize: '0.72rem',
            color: '#9ca3af',
            marginTop: '0.25rem',
          }}
        >
          {description}
        </p>
      )}
      {!isValid && (
        <p
          style={{
            fontSize: '0.72rem',
            color: '#ef4444',
            marginTop: '0.25rem',
          }}
        >
          Invalid HEX color format. Use #RRGGBB (e.g., #DDC0B4)
        </p>
      )}
    </div>
  )
}

// Made with Bob

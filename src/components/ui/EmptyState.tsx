'use client'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: compact ? '2rem' : '3.5rem',
        textAlign: 'center',
        color: '#9ca3af',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem'
      }}
    >
      {icon && (
        <div
          style={{
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
            borderRadius: '50%',
            background: '#f9fafb',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.25rem',
            color: '#d1d5db',
            fontSize: compact ? '1.5rem' : '2rem'
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: compact ? '0.875rem' : '1rem',
          fontWeight: '600',
          color: '#6b7280'
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: compact ? '0.78rem' : '0.875rem',
            color: '#9ca3af',
            maxWidth: 320,
            lineHeight: 1.5
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  )
}

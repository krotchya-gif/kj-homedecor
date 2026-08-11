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
        color: 'var(--neutral-400)',
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
            background: 'var(--neutral-100)',
            border: '2px solid var(--neutral-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.25rem',
            color: 'var(--neutral-300)',
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
          color: 'var(--neutral-600)'
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: compact ? '0.78rem' : '0.875rem',
            color: 'var(--neutral-400)',
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

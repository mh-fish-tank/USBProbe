import React from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchFilter({ value, onChange, placeholder }: SearchFilterProps): React.ReactElement {
  const { t } = useTranslation('devices')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '5px 8px',
        margin: '6px 8px'
      }}
    >
      <Icon icon="mdi:magnify" style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('tree.filter')}
        style={{
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 12,
          width: '100%',
          caretColor: 'var(--accent)'
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon icon="mdi:close-circle" style={{ fontSize: 13 }} />
        </button>
      )}
    </div>
  )
}

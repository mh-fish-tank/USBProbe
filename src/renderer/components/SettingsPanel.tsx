import React from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { useDeviceStore } from '../stores/device-store'
import { LanguageSwitcher } from './LanguageSwitcher'
import { UdevRulesManager } from './UdevRulesManager'

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 8
}

export function SettingsPanel(): React.ReactElement | null {
  const { t } = useTranslation('common')
  const settingsOpen = useDeviceStore((s) => s.settingsOpen)
  const setSettingsOpen = useDeviceStore((s) => s.setSettingsOpen)

  if (!settingsOpen) return null

  return (
    <div
      onClick={() => setSettingsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,27,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 500,
          maxHeight: '80vh',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--surface1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}
        >
          <Icon icon="mdi:cog-outline" style={{ color: 'var(--accent)', fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>
            {t('settings.title')}
          </span>
          <button
            onClick={() => setSettingsOpen(false)}
            title={t('actions.close')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <Icon icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}
        >
          {/* Language section */}
          <section>
            <div style={SECTION_LABEL}>{t('settings.language')}</div>
            <LanguageSwitcher />
          </section>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* udev Rules section */}
          <section>
            <UdevRulesManager />
          </section>
        </div>
      </div>
    </div>
  )
}

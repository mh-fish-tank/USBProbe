import React from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { api } from '../hooks/use-usb-api'

interface PermissionDialogProps {
  open: boolean
  onClose: () => void
}

export function PermissionDialog({ open, onClose }: PermissionDialogProps): React.ReactElement | null {
  const { t } = useTranslation('common')

  if (!open) return null

  async function handleInstallRule(): Promise<void> {
    await api.installPermissionRule()
    onClose()
  }

  function handleElevate(): void {
    // Elevation is handled externally; close the dialog
    onClose()
  }

  const actionBtnBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    transition: 'opacity 0.15s'
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,27,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--surface1)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(243,139,168,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon icon="mdi:shield-alert-outline" style={{ fontSize: 22, color: 'var(--error)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {t('permission.title')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('permission.description')}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Install udev rules */}
          <button
            onClick={handleInstallRule}
            style={{
              ...actionBtnBase,
              background: 'var(--accent)',
              border: 'none',
              color: 'var(--bg-primary)'
            }}
          >
            <span style={{ fontWeight: 600 }}>{t('permission.installRule')}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{t('permission.installRuleDesc')}</span>
          </button>

          {/* Elevate temporarily */}
          <button
            onClick={handleElevate}
            style={{
              ...actionBtnBase,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--surface2)',
              color: 'var(--text-primary)'
            }}
          >
            <span style={{ fontWeight: 600 }}>{t('permission.elevate')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('permission.elevateDesc')}</span>
          </button>

          {/* Skip */}
          <button
            onClick={onClose}
            style={{
              ...actionBtnBase,
              background: 'none',
              border: '1px solid var(--surface1)',
              color: 'var(--text-secondary)'
            }}
          >
            <span style={{ fontWeight: 500 }}>{t('permission.skip')}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('permission.skipDesc')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

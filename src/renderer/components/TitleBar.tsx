import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { api } from '../hooks/use-usb-api'
import { useDeviceStore } from '../stores/device-store'

const BTN_STYLE: React.CSSProperties = {
  WebkitAppRegion: 'no-drag' as any,
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  transition: 'background 0.15s, color 0.15s'
}

function TitleBtn({
  children,
  onClick,
  title,
  danger
}: {
  children: React.ReactNode
  onClick?: () => void
  title?: string
  danger?: boolean
}): React.ReactElement {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      style={{
        ...BTN_STYLE,
        background: hovered ? (danger ? 'rgba(243,139,168,0.2)' : 'var(--bg-hover)') : 'none',
        color: hovered ? (danger ? 'var(--error)' : 'var(--text-primary)') : 'var(--text-secondary)'
      }}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

export function TitleBar(): React.ReactElement {
  const { t } = useTranslation('common')
  const setSettingsOpen = useDeviceStore((s) => s.setSettingsOpen)

  async function handleExportJSON(): Promise<void> {
    const path = await api.showSaveDialog('json')
    if (path) await api.exportJSON(path)
  }

  async function handleExportCSV(): Promise<void> {
    const path = await api.showSaveDialog('csv')
    if (path) await api.exportCSV(path)
  }

  return (
    <div
      style={{
        height: 40,
        background: 'var(--bg-titlebar)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        WebkitAppRegion: 'drag' as any,
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        userSelect: 'none'
      }}
    >
      {/* Left: logo + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <Icon icon="mdi:usb" style={{ color: 'var(--accent)', fontSize: 18 }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>USBProbe</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>v1.0.0</span>
      </div>

      {/* Center: monitoring badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' as any }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(166,227,161,0.12)',
            border: '1px solid rgba(166,227,161,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--success)'
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              boxShadow: '0 0 6px var(--success)'
            }}
          />
          {t('app.monitoring')}
        </span>
      </div>

      {/* Right: actions + window controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          WebkitAppRegion: 'no-drag' as any,
          flex: 1,
          justifyContent: 'flex-end'
        }}
      >
        <TitleBtn onClick={handleExportJSON} title={t('export.json')}>
          <Icon icon="mdi:code-json" style={{ fontSize: 14 }} />
          <span>JSON</span>
        </TitleBtn>
        <TitleBtn onClick={handleExportCSV} title={t('export.csv')}>
          <Icon icon="mdi:file-delimited-outline" style={{ fontSize: 14 }} />
          <span>CSV</span>
        </TitleBtn>
        <TitleBtn onClick={() => setSettingsOpen(true)} title={t('app.settings')}>
          <Icon icon="mdi:cog-outline" style={{ fontSize: 15 }} />
        </TitleBtn>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

        {/* Window controls */}
        <TitleBtn onClick={() => api.minimizeWindow()} title="Minimize">
          <Icon icon="mdi:minus" style={{ fontSize: 14 }} />
        </TitleBtn>
        <TitleBtn onClick={() => api.maximizeWindow()} title="Maximize">
          <Icon icon="mdi:square-outline" style={{ fontSize: 13 }} />
        </TitleBtn>
        <TitleBtn onClick={() => api.closeWindow()} title="Close" danger>
          <Icon icon="mdi:close" style={{ fontSize: 14 }} />
        </TitleBtn>
      </div>
    </div>
  )
}

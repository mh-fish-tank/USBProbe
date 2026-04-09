import React from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/device-store'
import { OverviewTab } from './OverviewTab'
import { DescriptorsTab } from './DescriptorsTab'
import { HexViewerTab } from './HexViewerTab'

type Tab = 'overview' | 'descriptors' | 'hex'

interface TabButtonProps {
  id: Tab
  label: string
  active: boolean
  onClick: () => void
}

function TabButton({ id, label, active, onClick }: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 14px',
        fontSize: 12,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap'
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
      }}
    >
      {label}
    </button>
  )
}

export function DetailPanel(): React.ReactElement {
  const { t } = useTranslation('devices')
  const devices = useDeviceStore((s) => s.devices)
  const selectedDevicePath = useDeviceStore((s) => s.selectedDevicePath)
  const detailTab = useDeviceStore((s) => s.detailTab)
  const setDetailTab = useDeviceStore((s) => s.setDetailTab)

  const device = selectedDevicePath != null
    ? devices.find((d) => d.sysfsPath === selectedDevicePath) ?? null
    : null

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        background: 'var(--bg-primary)'
      }}
    >
      {device == null ? (
        /* Empty state */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: 12
          }}
        >
          <Icon icon="mdi:usb" style={{ fontSize: 48, opacity: 0.4 }} />
          <span style={{ fontSize: 13 }}>{t('detail.noSelection')}</span>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-titlebar)',
              flexShrink: 0,
              paddingLeft: 4
            }}
          >
            <TabButton
              id="overview"
              label={t('detail.overview')}
              active={detailTab === 'overview'}
              onClick={() => setDetailTab('overview')}
            />
            <TabButton
              id="descriptors"
              label={t('detail.descriptors')}
              active={detailTab === 'descriptors'}
              onClick={() => setDetailTab('descriptors')}
            />
            <TabButton
              id="hex"
              label={t('detail.hexViewer')}
              active={detailTab === 'hex'}
              onClick={() => setDetailTab('hex')}
            />
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {detailTab === 'overview' && <OverviewTab device={device} />}
            {detailTab === 'descriptors' && <DescriptorsTab device={device} />}
            {detailTab === 'hex' && <HexViewerTab device={device} />}
          </div>
        </>
      )}
    </div>
  )
}

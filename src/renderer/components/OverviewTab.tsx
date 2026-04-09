import React from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import type { USBDevice } from '../../shared/types'

interface CardProps {
  title: string
  icon: string
  children: React.ReactNode
}

function Card({ title, icon, children }: CardProps): React.ReactElement {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon icon={icon} style={{ fontSize: 14, color: 'var(--accent)' }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)'
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: React.ReactNode
}

function FieldRow({ label, value }: FieldRowProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

interface OverviewTabProps {
  device: USBDevice
}

export function OverviewTab({ device }: OverviewTabProps): React.ReactElement {
  const { t } = useTranslation('devices')
  const d = device.descriptor

  const vid = d.idVendor.toString(16).padStart(4, '0').toUpperCase()
  const pid = d.idProduct.toString(16).padStart(4, '0').toUpperCase()
  const speedLabel = t(`speed.${device.speed}`, { defaultValue: device.speed })

  // Build interface list from first configuration
  const ifaces = device.configurations[0]?.interfaces ?? []

  return (
    <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
      {/* Device header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}
      >
        <Icon icon="mdi:usb" style={{ fontSize: 28, color: 'var(--accent)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {device.product ?? `Device 0x${vid}:0x${pid}`}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {device.vendor?.name ?? device.manufacturer ?? '—'}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(166,227,161,0.15)',
            border: '1px solid rgba(166,227,161,0.3)',
            color: 'var(--success)',
            flexShrink: 0
          }}
        >
          {t('overview.connected')}
        </span>
      </div>

      {/* 4-card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12
        }}
      >
        {/* Identity */}
        <Card title={t('overview.identity')} icon="mdi:card-account-details-outline">
          <FieldRow label={t('overview.vid')} value={`0x${vid}`} />
          <FieldRow label={t('overview.pid')} value={`0x${pid}`} />
          <FieldRow label={t('overview.serial')} value={device.serialNumber} />
          <FieldRow label={t('overview.manufacturer')} value={device.manufacturer ?? device.vendor?.name} />
        </Card>

        {/* Connection */}
        <Card title={t('overview.connection')} icon="mdi:lightning-bolt">
          <FieldRow label={t('overview.speed')} value={speedLabel} />
          <FieldRow label={t('overview.usb')} value={d.bcdUSB} />
          <FieldRow
            label={t('overview.port')}
            value={device.portNumbers.length > 0 ? device.portNumbers.join('.') : '—'}
          />
          <FieldRow label={t('overview.busDev')} value={`${device.busNumber} / ${device.deviceNumber}`} />
        </Card>

        {/* Device Class */}
        <Card title={t('overview.deviceClass')} icon="mdi:chip">
          <FieldRow label={t('overview.class')} value={`0x${d.bDeviceClass.toString(16).padStart(2, '0')}`} />
          <FieldRow label={t('overview.subclass')} value={`0x${d.bDeviceSubClass.toString(16).padStart(2, '0')}`} />
          <FieldRow label={t('overview.protocol')} value={`0x${d.bDeviceProtocol.toString(16).padStart(2, '0')}`} />
          <FieldRow label={t('overview.configs')} value={d.bNumConfigurations} />
        </Card>

        {/* Interfaces */}
        <Card title={t('overview.interfaces')} icon="mdi:connection">
          {ifaces.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          ) : (
            ifaces.map((iface) => (
              <div key={iface.bInterfaceNumber} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(137,180,250,0.12)',
                    border: '1px solid rgba(137,180,250,0.25)',
                    color: 'var(--accent)',
                    flexShrink: 0
                  }}
                >
                  IF{iface.bInterfaceNumber}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {iface.description ?? iface.className ?? `Class 0x${iface.bInterfaceClass.toString(16)}`}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

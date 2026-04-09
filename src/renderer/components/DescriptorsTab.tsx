import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import type { USBDevice, USBConfiguration, USBInterface, USBEndpoint } from '../../shared/types'

// ─── Field Row ───────────────────────────────────────────────────────────────

interface DescFieldProps {
  name: string
  value: string | number
  description?: string
}

function DescField({ name, value, description }: DescFieldProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 8,
        padding: '4px 12px',
        alignItems: 'baseline'
      }}
    >
      <span className="mono" style={{ fontSize: 11, color: 'var(--blue)', wordBreak: 'break-word' }}>
        {name}
      </span>
      <div style={{ display: 'flex', flex: 1, gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--yellow)' }}>
          {typeof value === 'number' ? `0x${value.toString(16).toUpperCase()} (${value})` : value}
        </span>
        {description && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{description}</span>
        )}
      </div>
    </div>
  )
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

interface SectionProps {
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, icon, defaultOpen = true, children }: SectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginBottom: 10
      }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          background: 'var(--bg-secondary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          color: 'var(--text-primary)',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)')}
      >
        <Icon icon={open ? 'mdi:chevron-down' : 'mdi:chevron-right'} style={{ fontSize: 14, color: 'var(--text-muted)' }} />
        <Icon icon={icon} style={{ fontSize: 14, color: 'var(--accent)' }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
      </button>
      {open && (
        <div style={{ background: 'var(--bg-primary)', paddingTop: 4, paddingBottom: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Endpoint section ────────────────────────────────────────────────────────

function EndpointSection({ ep }: { ep: USBEndpoint }): React.ReactElement {
  const { t } = useTranslation('descriptors')
  const addr = `0x${ep.bEndpointAddress.toString(16).padStart(2, '0').toUpperCase()}`
  return (
    <Section
      title={`Endpoint ${addr} [${ep.direction.toUpperCase()}] ${ep.transferType}`}
      icon="mdi:arrow-left-right"
      defaultOpen={false}
    >
      <DescField name="bEndpointAddress" value={ep.bEndpointAddress} description={t('bEndpointAddress')} />
      <DescField name="bmAttributes" value={ep.bmAttributes} description={`Transfer type: ${ep.transferType}`} />
      <DescField name="wMaxPacketSize" value={ep.wMaxPacketSize} description={t('wMaxPacketSize')} />
      <DescField name="bInterval" value={ep.bInterval} description={t('bInterval')} />
    </Section>
  )
}

// ─── Interface section ───────────────────────────────────────────────────────

function InterfaceSection({ iface }: { iface: USBInterface }): React.ReactElement {
  const { t } = useTranslation('descriptors')
  const title = `Interface ${iface.bInterfaceNumber}${iface.description ? ` — ${iface.description}` : ''} (${iface.className})`

  return (
    <div style={{ marginLeft: 16 }}>
      <Section title={title} icon="mdi:lan" defaultOpen={false}>
        <DescField name="bInterfaceNumber" value={iface.bInterfaceNumber} description={t('bInterfaceNumber')} />
        <DescField name="bAlternateSetting" value={iface.bAlternateSetting} description={t('bAlternateSetting')} />
        <DescField name="bInterfaceClass" value={iface.bInterfaceClass} description={t('bInterfaceClass')} />
        <DescField name="bInterfaceSubClass" value={iface.bInterfaceSubClass} description={t('bInterfaceSubClass')} />
        <DescField name="bInterfaceProtocol" value={iface.bInterfaceProtocol} description={t('bInterfaceProtocol')} />
        {iface.endpoints.map((ep) => (
          <EndpointSection key={ep.bEndpointAddress} ep={ep} />
        ))}
      </Section>
    </div>
  )
}

// ─── Configuration section ────────────────────────────────────────────────────

function ConfigSection({ config }: { config: USBConfiguration }): React.ReactElement {
  const { t } = useTranslation('descriptors')
  const desc = config.description ? ` — ${config.description}` : ''
  return (
    <div style={{ marginLeft: 16 }}>
      <Section title={`Configuration ${config.bConfigurationValue}${desc}`} icon="mdi:tune" defaultOpen>
        <DescField name="bConfigurationValue" value={config.bConfigurationValue} description={t('bConfigurationValue')} />
        <DescField name="bmAttributes" value={config.bmAttributes} description={t('bmAttributes')} />
        <DescField
          name="bMaxPower"
          value={`${config.bMaxPower * 2} mA`}
          description={t('bMaxPower')}
        />
        {config.interfaces.map((iface) => (
          <InterfaceSection key={`${iface.bInterfaceNumber}-${iface.bAlternateSetting}`} iface={iface} />
        ))}
      </Section>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DescriptorsTabProps {
  device: USBDevice
}

export function DescriptorsTab({ device }: DescriptorsTabProps): React.ReactElement {
  const { t } = useTranslation('descriptors')
  const d = device.descriptor

  return (
    <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
      <Section title="Device Descriptor" icon="mdi:usb" defaultOpen>
        <DescField name="bLength" value={d.bLength} description={t('bLength')} />
        <DescField name="bDescriptorType" value={d.bDescriptorType} description={t('bDescriptorType')} />
        <DescField name="bcdUSB" value={d.bcdUSB} description={t('bcdUSB')} />
        <DescField name="bDeviceClass" value={d.bDeviceClass} description={t('bDeviceClass')} />
        <DescField name="bDeviceSubClass" value={d.bDeviceSubClass} description={t('bDeviceSubClass')} />
        <DescField name="bDeviceProtocol" value={d.bDeviceProtocol} description={t('bDeviceProtocol')} />
        <DescField name="bMaxPacketSize0" value={d.bMaxPacketSize0} description={t('bMaxPacketSize0')} />
        <DescField name="idVendor" value={d.idVendor} description={t('idVendor')} />
        <DescField name="idProduct" value={d.idProduct} description={t('idProduct')} />
        <DescField name="bcdDevice" value={d.bcdDevice} description={t('bcdDevice')} />
        <DescField name="iManufacturer" value={d.iManufacturer} description={t('iManufacturer')} />
        <DescField name="iProduct" value={d.iProduct} description={t('iProduct')} />
        <DescField name="iSerialNumber" value={d.iSerialNumber} description={t('iSerialNumber')} />
        <DescField name="bNumConfigurations" value={d.bNumConfigurations} description={t('bNumConfigurations')} />

        {device.configurations.map((config) => (
          <ConfigSection key={config.bConfigurationValue} config={config} />
        ))}
      </Section>
    </div>
  )
}

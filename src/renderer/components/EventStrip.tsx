import React from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/device-store'
import { EventLogPanel } from './EventLogPanel'
import type { USBEvent } from '../../shared/types'

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour12: false })
  } catch {
    return ts
  }
}

function EventChip({ event }: { event: USBEvent }): React.ReactElement {
  const isConnect = event.type === 'connect'
  const label = event.device?.product ?? event.summary ?? event.sysfsPath
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        fontSize: 11,
        flexShrink: 0,
        maxWidth: 200,
        overflow: 'hidden'
      }}
    >
      <Icon
        icon={isConnect ? 'mdi:plus' : 'mdi:minus'}
        style={{ fontSize: 11, color: isConnect ? 'var(--success)' : 'var(--error)', flexShrink: 0 }}
      />
      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>
        {formatTimestamp(event.timestamp)}
      </span>
      <span
        style={{
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>
        #{event.busNumber}
      </span>
    </span>
  )
}

export function EventStrip(): React.ReactElement {
  const { t } = useTranslation(['devices', 'common'])
  const events = useDeviceStore((s) => s.events)
  const expanded = useDeviceStore((s) => s.eventStripExpanded)
  const toggleEventStrip = useDeviceStore((s) => s.toggleEventStrip)

  const recent = events.slice(0, 5)

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Expanded panel floats above the strip */}
      {expanded && <EventLogPanel />}

      {/* The strip itself */}
      <div
        style={{
          height: 36,
          background: 'var(--bg-titlebar)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10
        }}
      >
        {/* Left label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            flexShrink: 0
          }}
        >
          {t('devices:events.title')}
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

        {/* Recent event chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {recent.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('devices:events.noEvents')}
            </span>
          ) : (
            recent.map((e) => <EventChip key={e.id} event={e} />)
          )}
        </div>

        {/* View All button */}
        <button
          onClick={toggleEventStrip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
        >
          {t('common:actions.viewAll')}
          <Icon icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'} style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  )
}

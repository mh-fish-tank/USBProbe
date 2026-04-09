import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/device-store'
import type { USBEvent } from '../../shared/types'

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour12: false })
  } catch {
    return ts
  }
}

function EventRow({ event }: { event: USBEvent }): React.ReactElement {
  const isConnect = event.type === 'connect'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s'
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Icon */}
      <Icon
        icon={isConnect ? 'mdi:plus-circle' : 'mdi:minus-circle'}
        style={{
          fontSize: 16,
          color: isConnect ? 'var(--success)' : 'var(--error)',
          flexShrink: 0,
          marginTop: 1
        }}
      />
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {formatTimestamp(event.timestamp)}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              background: isConnect ? 'rgba(166,227,161,0.15)' : 'rgba(243,139,168,0.15)',
              color: isConnect ? 'var(--success)' : 'var(--error)',
              fontWeight: 600
            }}
          >
            {isConnect ? 'CONNECT' : 'DISCONNECT'}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-primary)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {event.summary}
        </div>
        {event.sysfsPath && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {event.sysfsPath}
          </div>
        )}
      </div>
    </div>
  )
}

export function EventLogPanel(): React.ReactElement {
  const { t } = useTranslation(['devices', 'common'])
  const events = useDeviceStore((s) => s.events)
  const toggleEventStrip = useDeviceStore((s) => s.toggleEventStrip)
  const [query, setQuery] = useState('')

  const filtered =
    query.trim() === ''
      ? events
      : events.filter(
          (e) =>
            e.summary.toLowerCase().includes(query.toLowerCase()) ||
            e.sysfsPath.toLowerCase().includes(query.toLowerCase())
        )

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 36,
        left: 0,
        right: 0,
        height: 320,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          gap: 8,
          flexShrink: 0
        }}
      >
        <Icon icon="mdi:history" style={{ fontSize: 15, color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
          {t('devices:events.title')} ({events.length})
        </span>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', flex: 1, maxWidth: 260 }}>
          <Icon icon="mdi:magnify" style={{ fontSize: 13, color: 'var(--text-muted)' }} />
          <input
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12,
              width: '100%'
            }}
            placeholder={t('devices:events.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={toggleEventStrip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center'
          }}
          title={t('common:actions.close')}
        >
          <Icon icon="mdi:close" style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: 8
            }}
          >
            <Icon icon="mdi:timeline-remove" style={{ fontSize: 28 }} />
            <span style={{ fontSize: 12 }}>{t('devices:events.noEvents')}</span>
          </div>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}

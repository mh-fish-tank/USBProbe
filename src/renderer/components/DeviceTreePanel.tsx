import React, { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/device-store'
import { SearchFilter } from './SearchFilter'
import { TreeNode, deviceToTreeNode } from './TreeNode'
import type { TreeNodeData } from './TreeNode'
import type { USBDevice } from '../../shared/types'

function matchesFilter(device: USBDevice, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  const vid = device.descriptor.idVendor.toString(16).padStart(4, '0')
  const pid = device.descriptor.idProduct.toString(16).padStart(4, '0')
  const vidpid = `${vid}:${pid}`
  return (
    (device.product?.toLowerCase().includes(q) ?? false) ||
    (device.manufacturer?.toLowerCase().includes(q) ?? false) ||
    (device.vendor?.name.toLowerCase().includes(q) ?? false) ||
    vidpid.includes(q) ||
    device.sysfsPath.toLowerCase().includes(q)
  )
}

export function DeviceTreePanel(): React.ReactElement {
  const { t } = useTranslation('devices')
  const devices = useDeviceStore((s) => s.devices)
  const [search, setSearch] = useState('')

  const connectedCount = devices.length

  const busGroups = useMemo(() => {
    const filtered = devices.filter((d) => matchesFilter(d, search))

    // Group by busNumber
    const map = new Map<number, USBDevice[]>()
    for (const d of filtered) {
      const list = map.get(d.busNumber) ?? []
      list.push(d)
      map.set(d.busNumber, list)
    }

    // Sort buses
    const sortedBuses = [...map.keys()].sort((a, b) => a - b)

    const busNodes: TreeNodeData[] = sortedBuses.map((bus) => {
      const busDevices = map.get(bus)!.sort((a, b) => a.deviceNumber - b.deviceNumber)
      return {
        id: `bus-${bus}`,
        label: t('tree.bus', { bus }),
        icon: 'mdi:usb-port',
        iconColor: 'var(--accent)',
        children: busDevices.map(deviceToTreeNode)
      }
    })

    return busNodes
  }, [devices, search, t])

  const isEmpty = busGroups.length === 0

  return (
    <div
      style={{
        width: 250,
        minWidth: 200,
        maxWidth: 320,
        flexShrink: 0,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 6px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0
        }}
      >
        <span style={{ flex: 1, fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
          {t('tree.title')}
        </span>
        {/* Connected count */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--success)'
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connectedCount > 0 ? 'var(--success)' : 'var(--text-muted)',
              display: 'inline-block'
            }}
          />
          <span style={{ color: connectedCount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
            {connectedCount}
          </span>
        </span>
      </div>

      {/* Search */}
      <SearchFilter value={search} onChange={setSearch} />

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {isEmpty ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: 8,
              padding: 16,
              textAlign: 'center'
            }}
          >
            <Icon icon="mdi:usb-off" style={{ fontSize: 32 }} />
            <span style={{ fontSize: 12 }}>{t('tree.noDevices')}</span>
          </div>
        ) : (
          busGroups.map((node) => <TreeNode key={node.id} node={node} />)
        )}
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/device-store'
import { SearchFilter } from './SearchFilter'
import { TreeNode, deviceToTreeNode } from './TreeNode'
import type { TreeNodeData } from './TreeNode'
import type { USBDevice } from '../../shared/types'
import { api } from '../hooks/use-usb-api'

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
  const knownDevices = useDeviceStore((s) => s.knownDevices)
  const treeMode = useDeviceStore((s) => s.treeMode)
  const setTreeMode = useDeviceStore((s) => s.setTreeMode)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const onlineSysPaths = useMemo(
    () => new Set(devices.map((d) => d.sysfsPath)),
    [devices]
  )

  const connectedCount = devices.length

  // Build tree for online mode
  const onlineTree = useMemo(() => {
    const filtered = devices.filter((d) => matchesFilter(d, search))
    return buildBusTree(filtered, t)
  }, [devices, search, t])

  // Build tree for history mode
  const historyTree = useMemo(() => {
    const historyDevices = knownDevices.map((kd) => kd.device)
    const filtered = historyDevices.filter((d) => matchesFilter(d, search))
    return buildBusTree(filtered, t)
  }, [knownDevices, search, t])

  const currentTree = treeMode === 'online' ? onlineTree : historyTree
  const isEmpty = currentTree.length === 0

  const handleRefresh = async (): Promise<void> => {
    if (!api || refreshing) return
    setRefreshing(true)
    try {
      await api.refreshDevices()
    } catch (e) {
      console.error('Refresh failed:', e)
    }
    setTimeout(() => setRefreshing(false), 500)
  }

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
          flexShrink: 0
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
            {treeMode === 'online' ? t('tree.title') : t('tree.historyTitle')}
          </span>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title={t('tree.refresh')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 2,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Icon
              icon="mdi:refresh"
              style={{
                fontSize: 15,
                transition: 'transform 0.3s',
                transform: refreshing ? 'rotate(360deg)' : 'none'
              }}
            />
          </button>
          {/* Connected count */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
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

        {/* Online / History toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 2,
            gap: 2
          }}
        >
          <button
            onClick={() => setTreeMode('online')}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              fontWeight: treeMode === 'online' ? 600 : 400,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: treeMode === 'online' ? 'var(--accent)' : 'transparent',
              color: treeMode === 'online' ? 'var(--ctp-base)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <Icon icon="mdi:access-point" style={{ fontSize: 12 }} />
            {t('tree.online')}
          </button>
          <button
            onClick={() => setTreeMode('history')}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              fontWeight: treeMode === 'history' ? 600 : 400,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: treeMode === 'history' ? 'var(--accent)' : 'transparent',
              color: treeMode === 'history' ? 'var(--ctp-base)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <Icon icon="mdi:history" style={{ fontSize: 12 }} />
            {t('tree.history')}
          </button>
        </div>
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
            <Icon icon={treeMode === 'online' ? 'mdi:usb-off' : 'mdi:history'} style={{ fontSize: 32 }} />
            <span style={{ fontSize: 12 }}>
              {treeMode === 'online' ? t('tree.noDevices') : t('tree.noHistory')}
            </span>
          </div>
        ) : (
          currentTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              isHistoryMode={treeMode === 'history'}
              onlinePaths={onlineSysPaths}
            />
          ))
        )}
      </div>
    </div>
  )
}

function buildBusTree(
  devices: USBDevice[],
  t: (key: string, opts?: Record<string, unknown>) => string
): TreeNodeData[] {
  const map = new Map<number, USBDevice[]>()
  for (const d of devices) {
    const list = map.get(d.busNumber) ?? []
    list.push(d)
    map.set(d.busNumber, list)
  }

  return [...map.keys()].sort((a, b) => a - b).map((bus) => {
    const busDevices = map.get(bus)!.sort((a, b) => a.deviceNumber - b.deviceNumber)
    return {
      id: `bus-${bus}`,
      label: t('tree.bus', { bus }),
      icon: 'mdi:usb-port',
      iconColor: 'var(--accent)',
      children: busDevices.map(deviceToTreeNode)
    }
  })
}

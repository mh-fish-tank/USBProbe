import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { useDeviceStore } from '../stores/device-store'
import type { USBDevice } from '../../shared/types'

export interface TreeNodeData {
  id: string
  label: string
  icon?: string
  iconColor?: string
  vidPid?: string
  sysfsPath?: string
  children?: TreeNodeData[]
}

interface TreeNodeProps {
  node: TreeNodeData
  depth?: number
}

export function TreeNode({ node, depth = 0 }: TreeNodeProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true)
  const selectedDevicePath = useDeviceStore((s) => s.selectedDevicePath)
  const selectDevice = useDeviceStore((s) => s.selectDevice)

  const hasChildren = node.children && node.children.length > 0
  const isSelected = node.sysfsPath != null && node.sysfsPath === selectedDevicePath

  function handleClick(): void {
    if (node.sysfsPath) {
      selectDevice(node.sysfsPath)
    }
    if (hasChildren) {
      setExpanded((prev) => !prev)
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `3px 8px 3px ${8 + depth * 14}px`,
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
          margin: '1px 4px',
          background: isSelected ? 'rgba(137,180,250,0.15)' : 'transparent',
          border: isSelected ? '1px solid rgba(137,180,250,0.3)' : '1px solid transparent',
          transition: 'background 0.12s, border-color 0.12s'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }
        }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <Icon
            icon={expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
            style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}
          />
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {/* Device icon */}
        <Icon
          icon={node.icon ?? 'mdi:usb'}
          style={{
            fontSize: 15,
            color: node.iconColor ?? 'var(--text-muted)',
            flexShrink: 0
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize: 12,
            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: isSelected ? 600 : 400
          }}
        >
          {node.label}
        </span>

        {/* VID:PID badge */}
        {node.vidPid && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 4px',
              flexShrink: 0
            }}
          >
            {node.vidPid}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helper: build tree node from USBDevice ──────────────────────────────────

function isHub(device: USBDevice): boolean {
  return device.descriptor.bDeviceClass === 9
}

export function deviceToTreeNode(device: USBDevice): TreeNodeData {
  const vid = device.descriptor.idVendor.toString(16).padStart(4, '0')
  const pid = device.descriptor.idProduct.toString(16).padStart(4, '0')
  const label =
    device.product ??
    device.vendor?.name ??
    `Device ${device.deviceNumber}`

  return {
    id: device.sysfsPath,
    label,
    icon: isHub(device) ? 'mdi:hub' : 'mdi:usb',
    iconColor: isHub(device) ? 'var(--accent)' : 'var(--text-muted)',
    vidPid: `${vid}:${pid}`,
    sysfsPath: device.sysfsPath,
    children: []
  }
}

import React from 'react'
import { DeviceTreePanel } from './DeviceTreePanel'
import { DetailPanel } from './DetailPanel'

export function MainLayout(): React.ReactElement {
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      <DeviceTreePanel />
      <DetailPanel />
    </div>
  )
}

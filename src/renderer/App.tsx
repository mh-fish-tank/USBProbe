import React from 'react'
import { TitleBar } from './components/TitleBar'
import { MainLayout } from './components/MainLayout'
import { EventStrip } from './components/EventStrip'
import { SettingsPanel } from './components/SettingsPanel'
import { useDeviceListSync } from './hooks/use-usb-api'
import './styles/theme.css'

function App(): React.ReactElement {
  useDeviceListSync()
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      <MainLayout />
      <EventStrip />
      <SettingsPanel />
    </div>
  )
}

export default App

import { describe, it, expect, beforeEach } from 'vitest'
import { useDeviceStore } from '../../src/renderer/stores/device-store'

describe('deviceStore', () => {
  beforeEach(() => {
    useDeviceStore.setState({
      devices: [],
      events: [],
      selectedDevicePath: null,
      detailTab: 'overview',
      eventStripExpanded: false,
      settingsOpen: false
    })
  })

  it('sets devices', () => {
    const mockDevice = { sysfsPath: '/sys/bus/usb/devices/1-1', busNumber: 1, deviceNumber: 1 } as any
    useDeviceStore.getState().setDevices([mockDevice])
    expect(useDeviceStore.getState().devices).toHaveLength(1)
  })

  it('selects a device', () => {
    useDeviceStore.getState().selectDevice('/sys/bus/usb/devices/1-1')
    expect(useDeviceStore.getState().selectedDevicePath).toBe('/sys/bus/usb/devices/1-1')
  })

  it('adds events and caps at 1000', () => {
    const store = useDeviceStore.getState()
    for (let i = 0; i < 1005; i++) {
      store.addEvent({
        id: `evt-${i}`, timestamp: new Date().toISOString(),
        type: 'connect', busNumber: 1, deviceNumber: i,
        sysfsPath: `/sys/bus/usb/devices/1-${i}`,
        device: null, summary: `Device ${i}`
      } as any)
    }
    expect(useDeviceStore.getState().events.length).toBeLessThanOrEqual(1000)
  })

  it('toggles event strip', () => {
    expect(useDeviceStore.getState().eventStripExpanded).toBe(false)
    useDeviceStore.getState().toggleEventStrip()
    expect(useDeviceStore.getState().eventStripExpanded).toBe(true)
  })
})

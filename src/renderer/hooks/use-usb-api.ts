import { useEffect } from 'react'
import type { USBProbeAPI, USBDevice, USBEvent } from '../../shared/types'

// ─── Window augmentations ────────────────────────────────────────────────────

interface USBProbeEvents {
  onDeviceList(callback: (devices: USBDevice[]) => void): () => void
  onError(callback: (message: string) => void): () => void
}

declare global {
  interface Window {
    usbProbe: USBProbeAPI
    usbProbeEvents: USBProbeEvents
  }
}

// ─── Convenience export ──────────────────────────────────────────────────────

export const api = window.usbProbe

// ─── Hook ────────────────────────────────────────────────────────────────────

import { useDeviceStore } from '../stores/device-store'

export function useDeviceListSync(): void {
  const setDevices = useDeviceStore((s) => s.setDevices)
  const setEvents = useDeviceStore((s) => s.setEvents)
  const setKnownDevices = useDeviceStore((s) => s.setKnownDevices)
  const addEvent = useDeviceStore((s) => s.addEvent)

  useEffect(() => {
    if (!window.usbProbe || !window.usbProbeEvents) {
      console.warn('USBProbe API not available — preload script may not have loaded')
      return
    }

    // Initial load
    api.listDevices().then(setDevices).catch(console.error)
    api.getEvents(50).then(setEvents).catch(console.error)
    api.getKnownDevices().then(setKnownDevices).catch(console.error)

    // Subscribe to push updates
    const unsubDeviceList = window.usbProbeEvents.onDeviceList((devices) => {
      setDevices(devices)
      // Refresh known devices when online list changes
      api.getKnownDevices().then(setKnownDevices).catch(console.error)
    })

    const unsubDeviceEvent = api.onDeviceEvent((event: USBEvent) => {
      addEvent(event)
    })

    return () => {
      unsubDeviceList()
      unsubDeviceEvent()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

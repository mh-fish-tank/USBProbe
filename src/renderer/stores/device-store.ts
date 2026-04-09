import { create } from 'zustand'
import type { USBDevice, USBEvent } from '../../shared/types'

interface DeviceState {
  devices: USBDevice[]
  events: USBEvent[]
  selectedDevicePath: string | null
  detailTab: 'overview' | 'descriptors' | 'hex'
  eventStripExpanded: boolean
  settingsOpen: boolean
  // Actions
  setDevices: (devices: USBDevice[]) => void
  addEvent: (event: USBEvent) => void
  setEvents: (events: USBEvent[]) => void
  selectDevice: (sysfsPath: string | null) => void
  setDetailTab: (tab: 'overview' | 'descriptors' | 'hex') => void
  toggleEventStrip: () => void
  setSettingsOpen: (open: boolean) => void
}

const MAX_EVENTS = 1000

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  events: [],
  selectedDevicePath: null,
  detailTab: 'overview',
  eventStripExpanded: false,
  settingsOpen: false,

  setDevices: (devices) => set({ devices }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENTS)
    })),

  setEvents: (events) => set({ events }),

  selectDevice: (sysfsPath) => set({ selectedDevicePath: sysfsPath }),

  setDetailTab: (tab) => set({ detailTab: tab }),

  toggleEventStrip: () =>
    set((state) => ({ eventStripExpanded: !state.eventStripExpanded })),

  setSettingsOpen: (open) => set({ settingsOpen: open })
}))

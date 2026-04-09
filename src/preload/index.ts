import { contextBridge, ipcRenderer } from 'electron'
import type { USBProbeAPI, USBDevice, USBEvent, UdevRule, VendorInfo } from '../shared/types'

const usbProbe: USBProbeAPI = {
  platform: process.platform,

  async listDevices(): Promise<USBDevice[]> {
    return ipcRenderer.invoke('usb:list-devices')
  },

  async getDeviceDescriptor(sysfsPath: string): Promise<USBDevice> {
    return ipcRenderer.invoke('usb:get-descriptor', sysfsPath)
  },

  async getRawDescriptor(sysfsPath: string): Promise<number[]> {
    return ipcRenderer.invoke('usb:get-raw-descriptor', sysfsPath)
  },

  onDeviceEvent(callback: (event: USBEvent) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: USBEvent) => callback(data)
    ipcRenderer.on('usb:device-event', listener)
    return () => ipcRenderer.removeListener('usb:device-event', listener)
  },

  async getEvents(limit?: number, offset?: number): Promise<USBEvent[]> {
    return ipcRenderer.invoke('usb:get-events', limit, offset)
  },

  async getEventCount(): Promise<number> {
    return ipcRenderer.invoke('usb:get-event-count')
  },

  async searchEvents(query: string): Promise<USBEvent[]> {
    return ipcRenderer.invoke('usb:search-events', query)
  },

  async exportJSON(filePath: string): Promise<void> {
    return ipcRenderer.invoke('usb:export-json', filePath)
  },

  async exportCSV(filePath: string): Promise<void> {
    return ipcRenderer.invoke('usb:export-csv', filePath)
  },

  async showSaveDialog(format: 'json' | 'csv'): Promise<string | null> {
    return ipcRenderer.invoke('usb:show-save-dialog', format)
  },

  async lookupVendor(vid: number): Promise<VendorInfo | null> {
    return ipcRenderer.invoke('usb:lookup-vendor', vid)
  },

  async lookupProduct(vid: number, pid: number): Promise<VendorInfo | null> {
    return ipcRenderer.invoke('usb:lookup-product', vid, pid)
  },

  async listUdevRules(): Promise<UdevRule[]> {
    return ipcRenderer.invoke('usb:list-udev-rules')
  },

  async addUdevRule(
    rule: Omit<UdevRule, 'id' | 'filename' | 'rawRule' | 'managedByUSBProbe'>
  ): Promise<void> {
    return ipcRenderer.invoke('usb:add-udev-rule', rule)
  },

  async removeUdevRule(id: string): Promise<void> {
    return ipcRenderer.invoke('usb:remove-udev-rule', id)
  },

  async installPermissionRule(): Promise<boolean> {
    return ipcRenderer.invoke('usb:install-permission-rule')
  },

  minimizeWindow(): void {
    ipcRenderer.send('window:minimize')
  },

  maximizeWindow(): void {
    ipcRenderer.send('window:maximize')
  },

  closeWindow(): void {
    ipcRenderer.send('window:close')
  }
}

contextBridge.exposeInMainWorld('usbProbe', usbProbe)

// Expose event listener for device list updates and errors
contextBridge.exposeInMainWorld('usbProbeEvents', {
  onDeviceList(callback: (devices: USBDevice[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: USBDevice[]) => callback(data)
    ipcRenderer.on('usb:device-list', listener)
    return () => ipcRenderer.removeListener('usb:device-list', listener)
  },

  onError(callback: (message: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
    ipcRenderer.on('usb:error', listener)
    return () => ipcRenderer.removeListener('usb:error', listener)
  }
})

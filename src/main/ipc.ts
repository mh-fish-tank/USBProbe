import { ipcMain, BrowserWindow, dialog } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { USBEvent, USBDevice } from '../shared/types'
import { onWorkerMessage, sendToWorker } from './worker-manager'
import {
  insertEvent,
  getEvents,
  getEventCount,
  searchEvents
} from './database'
import { lookupVendorById, lookupProductById } from './usb-ids'
import { exportJSON, exportCSV } from './export-service'
import {
  listUdevRules,
  addUdevRule,
  removeUdevRule,
  installPermissionRule
} from './udev-rules'

// Keep the current device list in memory for export
let currentDevices: USBDevice[] = []

export function setupIPC(mainWindow: BrowserWindow): void {
  // ─── Worker message forwarding ──────────────────────────────────
  onWorkerMessage((msg) => {
    if (msg.type === 'device-list') {
      currentDevices = msg.devices as USBDevice[]
      mainWindow.webContents.send('usb:device-list', currentDevices)
    } else if (msg.type === 'device-event') {
      const raw = msg.event
      const action = raw.action

      // Build USBEvent
      let device = raw.device as USBDevice | null

      // Enrich with vendor/product info if device present
      if (device) {
        const vid = device.descriptor.idVendor
        const pid = device.descriptor.idProduct
        device = {
          ...device,
          vendor: lookupVendorById(vid),
          productInfo: lookupProductById(vid, pid)
        }
      }

      const event: USBEvent = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: action === 'add' ? 'connect' : 'disconnect',
        busNumber: device?.busNumber ?? 0,
        deviceNumber: device?.deviceNumber ?? 0,
        sysfsPath: raw.sysfsPath,
        device,
        summary: buildSummary(action, device, raw.sysfsPath)
      }

      // Persist to DB
      try {
        insertEvent(event)
      } catch (e) {
        console.error('Failed to insert event:', e)
      }

      // Forward to renderer
      mainWindow.webContents.send('usb:device-event', event)

      // Update current device list
      if (action === 'add' && device) {
        currentDevices = [...currentDevices.filter((d) => d.sysfsPath !== device!.sysfsPath), device]
      } else if (action === 'remove') {
        currentDevices = currentDevices.filter((d) => d.sysfsPath !== raw.sysfsPath)
      }
    } else if (msg.type === 'error') {
      mainWindow.webContents.send('usb:error', msg.message)
    }
  })

  // ─── IPC Handlers ───────────────────────────────────────────────

  ipcMain.handle('usb:list-devices', async () => {
    sendToWorker({ type: 'list-devices' })
    return currentDevices
  })

  ipcMain.handle('usb:get-descriptor', async (_event, sysfsPath: string) => {
    return new Promise<USBDevice>((resolve, reject) => {
      const off = onWorkerMessage((msg) => {
        if (msg.type === 'device-list' && msg.devices.length > 0) {
          off()
          resolve(msg.devices[0] as USBDevice)
        } else if (msg.type === 'error') {
          off()
          reject(new Error(msg.message))
        }
      })
      sendToWorker({ type: 'get-descriptor', sysfsPath })
    })
  })

  ipcMain.handle('usb:get-raw-descriptor', async (_event, sysfsPath: string) => {
    return new Promise<number[]>((resolve, reject) => {
      const off = onWorkerMessage((msg) => {
        if (msg.type === 'device-list') {
          off()
          resolve(msg.devices as unknown as number[])
        } else if (msg.type === 'error') {
          off()
          reject(new Error(msg.message))
        }
      })
      sendToWorker({ type: 'get-raw-descriptor', sysfsPath })
    })
  })

  ipcMain.handle('usb:get-events', async (_event, limit?: number, offset?: number) => {
    return getEvents(limit, offset)
  })

  ipcMain.handle('usb:get-event-count', async () => {
    return getEventCount()
  })

  ipcMain.handle('usb:search-events', async (_event, query: string) => {
    return searchEvents(query)
  })

  ipcMain.handle('usb:export-json', async (_event, filePath: string) => {
    await exportJSON(filePath, currentDevices)
  })

  ipcMain.handle('usb:export-csv', async (_event, filePath: string) => {
    await exportCSV(filePath)
  })

  ipcMain.handle('usb:show-save-dialog', async (_event, format: 'json' | 'csv') => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Export as ${format.toUpperCase()}`,
      defaultPath: `usbprobe-export.${format}`,
      filters: format === 'json'
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'CSV', extensions: ['csv'] }]
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('usb:lookup-vendor', async (_event, vid: number) => {
    return lookupVendorById(vid)
  })

  ipcMain.handle('usb:lookup-product', async (_event, vid: number, pid: number) => {
    return lookupProductById(vid, pid)
  })

  ipcMain.handle('usb:list-udev-rules', async () => {
    return listUdevRules()
  })

  ipcMain.handle('usb:add-udev-rule', async (_event, rule) => {
    addUdevRule(rule)
  })

  ipcMain.handle('usb:remove-udev-rule', async (_event, id: string) => {
    removeUdevRule(id)
  })

  ipcMain.handle('usb:install-permission-rule', async () => {
    return installPermissionRule()
  })

  // ─── Window controls ────────────────────────────────────────────
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow.close())
}

function buildSummary(
  action: string,
  device: USBDevice | null,
  sysfsPath: string
): string {
  const verb = action === 'add' ? 'Connected' : 'Disconnected'
  if (!device) return `${verb}: ${sysfsPath}`

  const name = device.product ?? device.vendor?.name ?? 'Unknown Device'
  const id = `${device.descriptor.idVendor.toString(16).padStart(4, '0')}:${device.descriptor.idProduct.toString(16).padStart(4, '0')}`
  return `${verb}: ${name} [${id}] at ${sysfsPath}`
}

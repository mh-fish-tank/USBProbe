import { writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { hostname } from 'os'
import type { USBProbeExport, USBDevice } from '../shared/types'
import { getAllEvents } from './database'

function getKernelVersion(): string {
  try {
    return execSync('uname -r', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export async function exportJSON(filePath: string, currentDevices: USBDevice[]): Promise<void> {
  const events = getAllEvents()

  const exportData: USBProbeExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    platform: {
      os: process.platform,
      kernel: getKernelVersion(),
      hostname: hostname()
    },
    devices: currentDevices,
    events
  }

  writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8')
}

export async function exportCSV(filePath: string): Promise<void> {
  const events = getAllEvents()

  const header = [
    'id',
    'timestamp',
    'type',
    'busNumber',
    'deviceNumber',
    'sysfsPath',
    'summary',
    'vendorId',
    'productId',
    'manufacturer',
    'product',
    'serialNumber'
  ].join(',')

  const rows = events.map((event) => {
    const d = event.device
    return [
      csvEscape(event.id),
      csvEscape(event.timestamp),
      csvEscape(event.type),
      event.busNumber,
      event.deviceNumber,
      csvEscape(event.sysfsPath),
      csvEscape(event.summary),
      d ? `0x${d.descriptor.idVendor.toString(16).padStart(4, '0')}` : '',
      d ? `0x${d.descriptor.idProduct.toString(16).padStart(4, '0')}` : '',
      csvEscape(d?.manufacturer ?? ''),
      csvEscape(d?.product ?? ''),
      csvEscape(d?.serialNumber ?? '')
    ].join(',')
  })

  const content = [header, ...rows].join('\n')
  writeFileSync(filePath, content, 'utf8')
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

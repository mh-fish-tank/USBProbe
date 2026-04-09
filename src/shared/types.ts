// src/shared/types.ts

// ─── Device Descriptor ──────────────────────────────────────────
export interface DeviceDescriptor {
  bLength: number
  bDescriptorType: number
  bcdUSB: string
  bDeviceClass: number
  bDeviceSubClass: number
  bDeviceProtocol: number
  bMaxPacketSize0: number
  idVendor: number
  idProduct: number
  bcdDevice: string
  iManufacturer: number
  iProduct: number
  iSerialNumber: number
  bNumConfigurations: number
}

export interface USBEndpoint {
  bEndpointAddress: number
  direction: 'in' | 'out'
  bmAttributes: number
  transferType: 'control' | 'isochronous' | 'bulk' | 'interrupt'
  wMaxPacketSize: number
  bInterval: number
  rawDescriptor: number[]
}

export interface USBInterface {
  bInterfaceNumber: number
  bAlternateSetting: number
  bInterfaceClass: number
  bInterfaceSubClass: number
  bInterfaceProtocol: number
  description: string | null
  className: string
  endpoints: USBEndpoint[]
  rawDescriptor: number[]
}

export interface USBConfiguration {
  bConfigurationValue: number
  bmAttributes: number
  bMaxPower: number
  description: string | null
  interfaces: USBInterface[]
  rawDescriptor: number[]
}

export type USBSpeed = 'low' | 'full' | 'high' | 'super' | 'super_plus'

export interface VendorInfo {
  id: number
  name: string
}

export interface USBDevice {
  busNumber: number
  deviceNumber: number
  portNumbers: number[]
  sysfsPath: string
  descriptor: DeviceDescriptor
  manufacturer: string | null
  product: string | null
  serialNumber: string | null
  vendor: VendorInfo | null
  productInfo: VendorInfo | null
  speed: USBSpeed
  speedMbps: number
  configurations: USBConfiguration[]
  rawDescriptor: number[]
}

// ─── Events ─────────────────────────────────────────────────────
export interface USBEvent {
  id: string
  timestamp: string
  type: 'connect' | 'disconnect'
  busNumber: number
  deviceNumber: number
  sysfsPath: string
  device: USBDevice | null
  summary: string
}

// ─── Export Format ──────────────────────────────────────────────
export interface USBProbeExport {
  version: '1.0.0'
  exportedAt: string
  platform: {
    os: string
    kernel: string
    hostname: string
  }
  devices: USBDevice[]
  events: USBEvent[]
}

// ─── udev Rules ─────────────────────────────────────────────────
export interface UdevRule {
  id: string
  filename: string
  matchVendor?: number
  matchProduct?: number
  matchDeviceClass?: number
  matchSerial?: string
  actionMode?: string
  actionGroup?: string
  actionSymlink?: string
  actionRun?: string
  rawRule: string
  managedByUSBProbe: boolean
}

// ─── IPC Channel Types ──────────────────────────────────────────
export interface USBProbeAPI {
  listDevices(): Promise<USBDevice[]>
  getDeviceDescriptor(sysfsPath: string): Promise<USBDevice>
  getRawDescriptor(sysfsPath: string): Promise<number[]>
  onDeviceEvent(callback: (event: USBEvent) => void): () => void
  getEvents(limit?: number, offset?: number): Promise<USBEvent[]>
  getEventCount(): Promise<number>
  searchEvents(query: string): Promise<USBEvent[]>
  exportJSON(filePath: string): Promise<void>
  exportCSV(filePath: string): Promise<void>
  showSaveDialog(format: 'json' | 'csv'): Promise<string | null>
  lookupVendor(vid: number): Promise<VendorInfo | null>
  lookupProduct(vid: number, pid: number): Promise<VendorInfo | null>
  listUdevRules(): Promise<UdevRule[]>
  addUdevRule(rule: Omit<UdevRule, 'id' | 'filename' | 'rawRule' | 'managedByUSBProbe'>): Promise<void>
  removeUdevRule(id: string): Promise<void>
  installPermissionRule(): Promise<boolean>
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  platform: string
}

// ─── Worker Messages ────────────────────────────────────────────
export type WorkerMessage =
  | { type: 'device-list'; devices: USBDevice[] }
  | { type: 'device-event'; event: { action: 'add' | 'remove'; sysfsPath: string; device: USBDevice | null } }
  | { type: 'error'; message: string }

export type MainToWorkerMessage =
  | { type: 'start-monitor' }
  | { type: 'stop-monitor' }
  | { type: 'list-devices' }
  | { type: 'get-descriptor'; sysfsPath: string }
  | { type: 'get-raw-descriptor'; sysfsPath: string }

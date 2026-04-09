/**
 * Maps native Rust addon device objects to the USBDevice TypeScript interface.
 * The Rust addon uses different field names than our shared types.
 */
import type {
  USBDevice,
  USBSpeed,
  USBConfiguration,
  USBInterface,
  USBEndpoint,
  DeviceDescriptor
} from '../shared/types'

interface NativeEndpoint {
  number: number
  direction: string
  transferType: string
  maxPacketSize: number
  interval: number
}

interface NativeInterface {
  number: number
  alternateSetting: number
  classCode: number
  subclassCode: number
  protocolCode: number
  driver: string | null
  endpoints: NativeEndpoint[]
}

interface NativeConfig {
  configurationValue: number
  maxPower: number
  attributes: number
  interfaces: NativeInterface[]
}

interface NativeDescriptor {
  usbVersion: string
  deviceClass: number
  deviceSubclass: number
  deviceProtocol: number
  maxPacketSize0: number
  vendorId: number
  productId: number
  deviceVersion: string
  manufacturerString: string | null
  productString: string | null
  numConfigurations: number
}

export interface NativeDevice {
  busNumber: number
  deviceAddress: number
  portPath: string
  speed: string
  vendorId: number
  productId: number
  manufacturer: string | null
  product: string | null
  deviceClass: number
  deviceSubclass: number
  deviceProtocol: number
  sysfsPath: string
  descriptor: NativeDescriptor
  configurations: NativeConfig[]
  rawDescriptors: number[]
}

function mapSpeed(native: string): { speed: USBSpeed; speedMbps: number } {
  switch (native) {
    case 'LowSpeed':
      return { speed: 'low', speedMbps: 1.5 }
    case 'FullSpeed':
      return { speed: 'full', speedMbps: 12 }
    case 'HighSpeed':
      return { speed: 'high', speedMbps: 480 }
    case 'SuperSpeed':
      return { speed: 'super', speedMbps: 5000 }
    case 'SuperSpeedPlus':
      return { speed: 'super_plus', speedMbps: 10000 }
    default:
      return { speed: 'full', speedMbps: 12 }
  }
}

function parsePortNumbers(portPath: string): number[] {
  // portPath like "1-1.2.3" → bus=1, ports=[1,2,3]
  const parts = portPath.split('-')
  if (parts.length < 2) return []
  return parts[1].split('.').map(Number).filter((n) => !isNaN(n))
}

const CLASS_NAMES: Record<number, string> = {
  0x00: 'Per-Interface',
  0x01: 'Audio',
  0x02: 'CDC Communications',
  0x03: 'HID',
  0x05: 'Physical',
  0x06: 'Image',
  0x07: 'Printer',
  0x08: 'Mass Storage',
  0x09: 'Hub',
  0x0a: 'CDC Data',
  0x0b: 'Smart Card',
  0x0d: 'Content Security',
  0x0e: 'Video',
  0x0f: 'Personal Healthcare',
  0x10: 'Audio/Video',
  0xdc: 'Diagnostic',
  0xe0: 'Wireless Controller',
  0xef: 'Miscellaneous',
  0xfe: 'Application Specific',
  0xff: 'Vendor Specific'
}

function mapEndpoint(ep: NativeEndpoint): USBEndpoint {
  const dir = ep.direction?.toLowerCase() === 'in' ? 'in' : 'out' as const
  const addr = ep.number | (dir === 'in' ? 0x80 : 0x00)

  let transferType: USBEndpoint['transferType'] = 'control'
  const tt = (ep.transferType || '').toLowerCase()
  if (tt.includes('interrupt')) transferType = 'interrupt'
  else if (tt.includes('bulk')) transferType = 'bulk'
  else if (tt.includes('isoc')) transferType = 'isochronous'

  let bmAttributes = 0
  switch (transferType) {
    case 'isochronous': bmAttributes = 1; break
    case 'bulk': bmAttributes = 2; break
    case 'interrupt': bmAttributes = 3; break
  }

  return {
    bEndpointAddress: addr,
    direction: dir,
    bmAttributes,
    transferType,
    wMaxPacketSize: ep.maxPacketSize ?? 0,
    bInterval: ep.interval ?? 0,
    rawDescriptor: []
  }
}

function mapInterface(iface: NativeInterface): USBInterface {
  const className = CLASS_NAMES[iface.classCode] ?? `Unknown (0x${iface.classCode.toString(16).padStart(2, '0')})`

  return {
    bInterfaceNumber: iface.number ?? 0,
    bAlternateSetting: iface.alternateSetting ?? 0,
    bInterfaceClass: iface.classCode ?? 0,
    bInterfaceSubClass: iface.subclassCode ?? 0,
    bInterfaceProtocol: iface.protocolCode ?? 0,
    description: iface.driver ?? null,
    className,
    endpoints: (iface.endpoints ?? []).map(mapEndpoint),
    rawDescriptor: []
  }
}

function mapConfiguration(config: NativeConfig): USBConfiguration {
  return {
    bConfigurationValue: config.configurationValue ?? 0,
    bmAttributes: config.attributes ?? 0,
    bMaxPower: config.maxPower ?? 0,
    description: null,
    interfaces: (config.interfaces ?? []).map(mapInterface),
    rawDescriptor: []
  }
}

export function mapNativeDevice(d: NativeDevice): USBDevice {
  const { speed, speedMbps } = mapSpeed(d.speed)
  const desc = d.descriptor ?? {} as NativeDescriptor

  const descriptor: DeviceDescriptor = {
    bLength: 18,
    bDescriptorType: 1,
    bcdUSB: desc.usbVersion ?? '0.00',
    bDeviceClass: desc.deviceClass ?? d.deviceClass ?? 0,
    bDeviceSubClass: desc.deviceSubclass ?? d.deviceSubclass ?? 0,
    bDeviceProtocol: desc.deviceProtocol ?? d.deviceProtocol ?? 0,
    bMaxPacketSize0: desc.maxPacketSize0 ?? 0,
    idVendor: desc.vendorId ?? d.vendorId ?? 0,
    idProduct: desc.productId ?? d.productId ?? 0,
    bcdDevice: desc.deviceVersion ?? '0.00',
    iManufacturer: desc.manufacturerString ? 1 : 0,
    iProduct: desc.productString ? 1 : 0,
    iSerialNumber: 0,
    bNumConfigurations: desc.numConfigurations ?? 0
  }

  return {
    busNumber: d.busNumber ?? 0,
    deviceNumber: d.deviceAddress ?? 0,
    portNumbers: parsePortNumbers(d.portPath ?? ''),
    sysfsPath: d.sysfsPath ?? '',
    descriptor,
    manufacturer: d.manufacturer ?? null,
    product: d.product ?? null,
    serialNumber: null,
    vendor: null,
    productInfo: null,
    speed,
    speedMbps,
    configurations: (d.configurations ?? []).map(mapConfiguration),
    rawDescriptor: d.rawDescriptors ?? []
  }
}

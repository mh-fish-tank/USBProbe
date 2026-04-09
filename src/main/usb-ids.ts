import { join } from 'path'
import type { VendorInfo } from '../shared/types'

// Native addon VendorEntry type
interface VendorEntry {
  id: number
  name: string
  products: Array<{ id: number; name: string }>
}

const path = require('path')
const native = require(path.join(__dirname, '../../native/usbprobe-native.linux-x64-gnu.node'))

// Cache: vid -> VendorEntry
const vendorMap = new Map<number, VendorEntry>()
let loaded = false

export function loadUsbIds(): void {
  if (loaded) return
  try {
    const vendors: VendorEntry[] = native.parseUsbIds()
    for (const vendor of vendors) {
      vendorMap.set(vendor.id, vendor)
    }
    loaded = true
    console.log(`USB IDs loaded: ${vendorMap.size} vendors`)
  } catch (e) {
    console.error('Failed to load USB IDs:', e)
  }
}

export function lookupVendorById(vid: number): VendorInfo | null {
  const vendor = vendorMap.get(vid)
  if (!vendor) return null
  return { id: vendor.id, name: vendor.name }
}

export function lookupProductById(vid: number, pid: number): VendorInfo | null {
  const vendor = vendorMap.get(vid)
  if (!vendor) return null
  const product = vendor.products.find((p) => p.id === pid)
  if (!product) return null
  return { id: product.id, name: product.name }
}

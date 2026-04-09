import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('usbProbe', {
  platform: process.platform
})

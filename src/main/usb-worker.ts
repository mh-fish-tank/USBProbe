import { parentPort } from 'worker_threads'
import type { MainToWorkerMessage, WorkerMessage } from '../shared/types'

// Load native addon - find the .node file
const path = require('path')
const native = require(path.join(__dirname, '../../native/usbprobe-native.linux-x64-gnu.node'))

let monitorHandle: { stop: () => void } | null = null

function postMessage(msg: WorkerMessage): void {
  parentPort?.postMessage(msg)
}

function handleMessage(msg: MainToWorkerMessage): void {
  switch (msg.type) {
    case 'list-devices': {
      try {
        const devices = native.listDevices()
        postMessage({ type: 'device-list', devices })
      } catch (e) {
        postMessage({ type: 'error', message: `Failed to list devices: ${e}` })
      }
      break
    }
    case 'start-monitor': {
      if (monitorHandle) return
      try {
        monitorHandle = native.startMonitor((_err: Error | null, event: any) => {
          postMessage({
            type: 'device-event',
            event: {
              action: event.action as 'add' | 'remove',
              sysfsPath: event.sysfsPath,
              device: event.device ?? null
            }
          })
        })
      } catch (e) {
        postMessage({ type: 'error', message: `Failed to start monitor: ${e}` })
      }
      break
    }
    case 'stop-monitor': {
      if (monitorHandle) {
        monitorHandle.stop()
        monitorHandle = null
      }
      break
    }
    case 'get-descriptor': {
      try {
        const device = native.getDeviceDescriptor(msg.sysfsPath)
        postMessage({ type: 'device-list', devices: [device] })
      } catch (e) {
        postMessage({ type: 'error', message: `Failed to get descriptor: ${e}` })
      }
      break
    }
    case 'get-raw-descriptor': {
      try {
        const raw = native.getRawDescriptor(msg.sysfsPath)
        // Send as device-list with raw data (workaround - main process handles this)
        postMessage({ type: 'device-list', devices: raw })
      } catch (e) {
        postMessage({ type: 'error', message: `Failed to get raw descriptor: ${e}` })
      }
      break
    }
  }
}

parentPort?.on('message', handleMessage)

// Auto-start
handleMessage({ type: 'list-devices' })
handleMessage({ type: 'start-monitor' })

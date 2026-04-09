import { Worker } from 'worker_threads'
import { join } from 'path'
import type { WorkerMessage, MainToWorkerMessage } from '../shared/types'

type WorkerEventHandler = (msg: WorkerMessage) => void

let worker: Worker | null = null
let handlers: WorkerEventHandler[] = []

export function startWorker(): void {
  if (worker) return
  worker = new Worker(join(__dirname, 'usb-worker.js'))
  worker.on('message', (msg: WorkerMessage) => {
    for (const handler of handlers) handler(msg)
  })
  worker.on('error', (err) => console.error('USB Worker error:', err))
  worker.on('exit', (code) => {
    console.log('USB Worker exited:', code)
    worker = null
  })
}

export function stopWorker(): void {
  if (worker) {
    sendToWorker({ type: 'stop-monitor' })
    worker.terminate()
    worker = null
  }
}

export function sendToWorker(msg: MainToWorkerMessage): void {
  worker?.postMessage(msg)
}

export function onWorkerMessage(handler: WorkerEventHandler): () => void {
  handlers.push(handler)
  return () => {
    handlers = handlers.filter((h) => h !== handler)
  }
}

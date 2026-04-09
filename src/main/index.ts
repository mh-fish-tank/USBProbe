import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { initDatabase, closeDatabase } from './database'
import { setupIPC } from './ipc'
import { startWorker, stopWorker } from './worker-manager'
import { loadUsbIds } from './usb-ids'

const isDev = process.env['NODE_ENV'] === 'development'

function resolvePreload(): string {
  // package.json has "type": "module" so CJS must use .cjs extension
  const candidates = [
    join(__dirname, '../preload/index.cjs'),
    join(__dirname, '../preload/index.js'),
    join(__dirname, '../preload/index.mjs')
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log('Preload resolved to:', p)
      return p
    }
  }
  console.error('Preload not found! Tried:', candidates)
  return candidates[0]
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: resolvePreload(),
      sandbox: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow!.webContents.executeJavaScript(`
      console.log('[Debug] window.usbProbe:', typeof window.usbProbe);
      console.log('[Debug] window.usbProbeEvents:', typeof window.usbProbeEvents);
    `)
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('Preload error:', preloadPath, error)
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  try {
    initDatabase()
  } catch (e) {
    console.error('Failed to initialize database:', e)
  }

  try {
    loadUsbIds()
  } catch (e) {
    console.error('Failed to load USB IDs:', e)
  }

  createWindow()

  if (mainWindow) {
    setupIPC(mainWindow)
  }

  try {
    startWorker()
  } catch (e) {
    console.error('Failed to start USB worker:', e)
  }
})

app.on('window-all-closed', () => {
  stopWorker()
  closeDatabase()
  app.quit()
})

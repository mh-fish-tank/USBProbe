import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { initDatabase, closeDatabase } from './database'
import { setupIPC } from './ipc'
import { startWorker, stopWorker } from './worker-manager'
import { loadUsbIds } from './usb-ids'

const isDev = process.env['NODE_ENV'] === 'development'

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
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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

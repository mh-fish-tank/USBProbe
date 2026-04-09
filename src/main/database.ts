import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { USBEvent, USBDevice, KnownDevice } from '../shared/types'

let db: Database.Database | null = null

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'usbprobe.db')
  db = new Database(dbPath)

  // Enable WAL journal mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('connect', 'disconnect')),
      busNumber INTEGER NOT NULL,
      deviceNumber INTEGER NOT NULL,
      sysfsPath TEXT NOT NULL,
      device TEXT,
      summary TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_sysfsPath ON events(sysfsPath);

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS known_devices (
      vid_pid TEXT PRIMARY KEY,
      sysfs_path TEXT NOT NULL,
      device_snapshot TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_known_devices_last_seen ON known_devices(last_seen DESC);
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function insertEvent(event: USBEvent): void {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO events (id, timestamp, type, busNumber, deviceNumber, sysfsPath, device, summary)
    VALUES (@id, @timestamp, @type, @busNumber, @deviceNumber, @sysfsPath, @device, @summary)
  `)
  stmt.run({
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    busNumber: event.busNumber,
    deviceNumber: event.deviceNumber,
    sysfsPath: event.sysfsPath,
    device: event.device ? JSON.stringify(event.device) : null,
    summary: event.summary
  })
}

export function getEvents(limit: number = 100, offset: number = 0): USBEvent[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(`
    SELECT * FROM events ORDER BY timestamp DESC LIMIT ? OFFSET ?
  `)
  const rows = stmt.all(limit, offset) as any[]
  return rows.map(rowToEvent)
}

export function getEventCount(): number {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT COUNT(*) as count FROM events')
  const result = stmt.get() as { count: number }
  return result.count
}

export function searchEvents(query: string): USBEvent[] {
  if (!db) throw new Error('Database not initialized')
  const pattern = `%${query}%`
  const stmt = db.prepare(`
    SELECT * FROM events
    WHERE summary LIKE ?
       OR sysfsPath LIKE ?
       OR device LIKE ?
    ORDER BY timestamp DESC
    LIMIT 500
  `)
  const rows = stmt.all(pattern, pattern, pattern) as any[]
  return rows.map(rowToEvent)
}

export function getAllEvents(): USBEvent[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM events ORDER BY timestamp DESC')
  const rows = stmt.all() as any[]
  return rows.map(rowToEvent)
}

export function upsertKnownDevice(device: USBDevice): void {
  if (!db) throw new Error('Database not initialized')
  const vid = device.descriptor.idVendor.toString(16).padStart(4, '0')
  const pid = device.descriptor.idProduct.toString(16).padStart(4, '0')
  const vidPid = `${vid}:${pid}`
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO known_devices (vid_pid, sysfs_path, device_snapshot, first_seen, last_seen)
    VALUES (@vidPid, @sysfsPath, @snapshot, @now, @now)
    ON CONFLICT(vid_pid) DO UPDATE SET
      sysfs_path = @sysfsPath,
      device_snapshot = @snapshot,
      last_seen = @now
  `)
  stmt.run({
    vidPid,
    sysfsPath: device.sysfsPath,
    snapshot: JSON.stringify(device),
    now
  })
}

export function getKnownDevices(): KnownDevice[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare('SELECT * FROM known_devices ORDER BY last_seen DESC').all() as any[]
  return rows.map((row) => ({
    sysfsPath: row.sysfs_path,
    device: JSON.parse(row.device_snapshot),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen
  }))
}

function rowToEvent(row: any): USBEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    type: row.type as 'connect' | 'disconnect',
    busNumber: row.busNumber,
    deviceNumber: row.deviceNumber,
    sysfsPath: row.sysfsPath,
    device: row.device ? JSON.parse(row.device) : null,
    summary: row.summary
  }
}

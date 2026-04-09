# USBProbe — Design Spec

## Overview

USBProbe is a Linux desktop application for monitoring USB device connections/disconnections and inspecting detailed USB descriptors. Built for developers working on USB drivers/firmware, with secondary use for system operations monitoring.

**Repository:** `git@github.com:mh-fish-tank/USBProbe.git`

## Scope

### In Scope (v1)
- Real-time USB device monitoring (connect/disconnect)
- Complete USB descriptor viewing (Device, Configuration, Interface, Endpoint)
- Hex viewer with multi-base display (HEX/DEC/BIN/OCT) and field interpretation
- VID/PID vendor/product lookup (USB ID Database)
- Persistent event logging (SQLite)
- Export to JSON/CSV with versioned data schema
- USB device tree view (Bus → Hub → Device hierarchy)
- udev rules manager (add/edit/delete rules)
- Permission elevation (udev rules install / pkexec fallback)
- i18n (zh-CN, en)
- Iconify icons throughout the UI

### Out of Scope (v1)
- Real-time USB transfer data capture / URB tracing (v2+)
- Bandwidth usage graphs (v2+)
- macOS / Windows support
- Remote device monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron |
| Frontend | React + TypeScript |
| Styling | Catppuccin theme (dark mode) |
| Icons | Iconify |
| i18n | react-i18next |
| Backend DB | SQLite (better-sqlite3) |
| USB layer | Rust native addon (napi-rs) |
| USB monitoring | libudev (via Rust `udev` crate) |
| Descriptor reading | sysfs direct read |
| Build | Vite (renderer) + electron-builder |
| Test | Vitest + React Testing Library + Rust unit tests |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Renderer Process                │
│  React + TypeScript + Catppuccin Theme           │
│  ┌───────────┬──────────────┬──────────────┐     │
│  │ USB Tree  │  Detail Tabs │  Event Strip │     │
│  │  Panel    │  (Overview/  │  (bottom)    │     │
│  │  (left)   │  Descriptors/│              │     │
│  │           │  Hex)        │              │     │
│  └───────────┴──────────────┴──────────────┘     │
└────────────────────┬────────────────────────────-┘
                     │ Electron IPC (contextBridge)
┌────────────────────┴─────────────────────────────┐
│                  Main Process                     │
│  - IPC handler / API routing                     │
│  - SQLite read/write (better-sqlite3)            │
│  - Export service (JSON/CSV)                     │
│  - USB ID Database lookup (in-memory cache)      │
│                     │                             │
│          worker_threads                           │
│  ┌──────────────────┴──────────────────┐          │
│  │         USB Worker Thread           │          │
│  │  Rust napi-rs addon:               │          │
│  │  - udev event listening (libudev)   │          │
│  │  - sysfs descriptor reading         │          │
│  │  - Raw binary data extraction       │          │
│  └─────────────────────────────────────┘          │
└───────────────────────────────────────────────────┘
```

### Key Decisions

- **IPC**: Electron contextBridge exposes type-safe API. Renderer never accesses Node.js directly.
- **Database**: SQLite (better-sqlite3) — lightweight, single file, no external service needed.
- **Worker communication**: Worker pushes device events via `parentPort.postMessage`, Main Process relays to Renderer.
- **USB ID Database**: `usb.ids` file parsed and cached in memory on startup.
- **Rust addon runs in Worker Thread**: udev event loop does not block Main Process event loop.

## Data Model

### Export Format (Versioned)

```typescript
interface USBProbeExport {
  version: "1.0.0"              // Data schema version
  exportedAt: string            // ISO 8601
  platform: {
    os: string                  // "linux"
    kernel: string              // e.g. "6.19.11-arch1-1"
    hostname: string
  }
  devices: USBDevice[]
  events: USBEvent[]
}
```

### Device Model

```typescript
interface USBDevice {
  // Identity
  busNumber: number
  deviceNumber: number
  portNumbers: number[]         // Hub port path, e.g. [1, 3, 2]
  sysfsPath: string             // "/sys/bus/usb/devices/1-3.2"

  // Device Descriptor
  descriptor: {
    bLength: number
    bDescriptorType: number
    bcdUSB: string              // "2.00", "3.10"
    bDeviceClass: number
    bDeviceSubClass: number
    bDeviceProtocol: number
    bMaxPacketSize0: number
    idVendor: number            // 0x046d
    idProduct: number           // 0xc52b
    bcdDevice: string
    iManufacturer: number
    iProduct: number
    iSerialNumber: number
    bNumConfigurations: number
  }

  // String descriptors (resolved)
  manufacturer: string | null
  product: string | null
  serialNumber: string | null

  // VID/PID lookup results
  vendor: { id: number; name: string } | null
  productInfo: { id: number; name: string } | null

  // Speed
  speed: "low" | "full" | "high" | "super" | "super_plus"
  speedMbps: number             // 1.5, 12, 480, 5000, 10000

  // Configuration/Interface/Endpoint (full descriptor tree)
  configurations: USBConfiguration[]

  // Raw binary data
  rawDescriptor: number[]       // Device descriptor raw bytes
}

interface USBConfiguration {
  bConfigurationValue: number
  bmAttributes: number
  bMaxPower: number             // in mA
  description: string | null
  interfaces: USBInterface[]
  rawDescriptor: number[]
}

interface USBInterface {
  bInterfaceNumber: number
  bAlternateSetting: number
  bInterfaceClass: number
  bInterfaceSubClass: number
  bInterfaceProtocol: number
  description: string | null
  className: string             // Resolved: "HID", "Mass Storage", etc.
  endpoints: USBEndpoint[]
  rawDescriptor: number[]
}

interface USBEndpoint {
  bEndpointAddress: number
  direction: "in" | "out"
  bmAttributes: number
  transferType: "control" | "isochronous" | "bulk" | "interrupt"
  wMaxPacketSize: number
  bInterval: number
  rawDescriptor: number[]
}
```

### Event Model

```typescript
interface USBEvent {
  id: string                    // UUID
  timestamp: string             // ISO 8601
  type: "connect" | "disconnect"
  busNumber: number
  deviceNumber: number
  sysfsPath: string
  device: USBDevice | null      // null on disconnect
  summary: string               // "Logitech USB Receiver connected on Bus 001"
}
```

### SQLite Schema

Two core tables:

- **`events`**: One row per plug/unplug event. `device_snapshot` column stores JSON-serialized full device info.
- **`metadata`**: Stores schema version, creation time — used for data migrations.

## UI Design

### Theme & Style
- Catppuccin Mocha dark theme
- Iconify icons throughout
- Modern IDE aesthetic: rounded cards, soft colors, clear information hierarchy

### Layout: Hybrid
- **Left**: USB Device Tree Panel (Bus → Hub → Device hierarchy, with search/filter)
- **Right**: Detail Panel with tabbed views (Overview / Descriptors / Hex Viewer)
- **Bottom**: Event Strip (compact recent events, expandable to full log with search/filter/pagination)
- **Top**: Title Bar (monitoring status indicator, Export dropdown, Settings)

### Component Tree

```
App
├─ TitleBar — status indicator / export button / settings
├─ MainLayout
│  ├─ DeviceTreePanel — left sidebar
│  │  ├─ SearchFilter
│  │  └─ TreeNode — recursive (Bus → Hub → Device)
│  └─ DetailPanel — right tabbed area
│     ├─ OverviewTab — device info cards (Identity / Connection / Class / Interfaces)
│     ├─ DescriptorsTab — descriptor tree display with field explanations
│     └─ HexViewerTab — multi-base raw data viewer
├─ EventStrip — bottom event bar (expandable)
│  └─ EventLogPanel — expanded: search / filter / pagination
└─ SettingsPanel
   ├─ LanguageSwitcher
   └─ UdevRulesManager
```

### Hex Viewer

- **Color-coded fields**: Each descriptor field gets a unique Catppuccin color, applied to both hex bytes and interpretation panel.
- **Hover linkage**: Hovering hex bytes highlights the field in the interpretation panel and vice versa.
- **Base switching**: HEX / DEC / BIN / OCT toggle in toolbar; data area updates in real-time. Interpretation panel always shows multiple bases.
- **Field interpretation**: Each field shows: name, offset, raw value, parsed meaning, description (i18n).
- **Copy/Export**: Copy raw data in current base, or export annotated descriptor document.
- **Descriptor switching**: Dropdown to switch between Device / Configuration / Interface / Endpoint descriptors.

## Rust Addon API (napi-rs)

```rust
#[napi]
fn list_devices() -> Vec<UsbDeviceInfo>

#[napi]
fn get_device_descriptor(sysfs_path: String) -> DeviceDescriptor

#[napi]
fn get_raw_descriptor(sysfs_path: String) -> Buffer

#[napi]
fn start_monitor(callback: JsFunction) -> MonitorHandle
// callback receives: { type: "add"|"remove", sysfs_path, device_info }

#[napi]
fn stop_monitor(handle: MonitorHandle)

#[napi]
fn parse_usb_ids() -> HashMap<u16, VendorInfo>
```

**Rust crate dependencies:**
- `napi` / `napi-derive` — Node.js bindings
- `udev` — libudev bindings for device event monitoring
- `nix` — sysfs file reading

## Permission Handling

### Tiered Strategy

**Tier 1: udev rules (recommended, persistent)**
- Detect permission denied errors
- Prompt user to install a udev rule via dialog
- Auto-generate rule file, write to `/etc/udev/rules.d/99-usbprobe.rules` via `pkexec`
- One-time authorization, permanent effect

**Tier 2: pkexec instant elevation (fallback)**
- "Restart with admin privileges" button
- Elevates only the Rust worker process via `pkexec`, not the entire Electron app
- System-native password dialog

**Tier 3: Skip**
- User can dismiss; app shows only accessible information
- Clear indication of which fields are unavailable due to permissions

### Dialog Flow
```
Permission insufficient detected
  → Show dialog:
    "Some USB descriptors require elevated permissions to read"
    [Install udev rules (recommended)] — one-time auth, permanent
    [Elevate temporarily]              — this session only
    [Skip]                             — show available info only
```

## udev Rules Manager

Located in Settings panel:

- Lists all USBProbe-managed rules in `/etc/udev/rules.d/99-usbprobe*.rules`
- Visual editor for adding/editing/deleting rules
  - Match conditions: VID, PID, Device Class, Serial Number
  - Actions: MODE, GROUP, SYMLINK, RUN
- Changes written via `pkexec`, auto-runs `udevadm control --reload-rules`
- Context menu shortcut: right-click device in tree → "Create udev rule for this device"

## i18n

- **Library**: react-i18next
- **Initial languages**: zh-CN, en
- **Translation file structure**:
  ```
  locales/
    zh-CN/
      common.json       # General UI text
      devices.json      # Device-related
      descriptors.json  # USB descriptor field names + explanations
    en/
      common.json
      devices.json
      descriptors.json
  ```
- Descriptor field explanations in Hex Viewer are i18n-aware
- USB technical terms (bLength, idVendor, etc.) remain in English; only descriptions are translated
- Language switch in Settings, persisted to local config

## Error Handling

- **Rust layer**: All errors convert to `napi::Error`, never panic
- **Main Process**: Catches errors, pushes toast notifications to Renderer via IPC
- **Permission errors**: Trigger the tiered permission dialog (see Permission Handling)
- **Graceful degradation**: If a specific descriptor read fails, show available data with clear "unavailable" markers

## Testing Strategy

- **Rust addon**: Unit tests covering descriptor parsing logic with fixed binary data
- **React components**: Vitest + React Testing Library — Hex Viewer base conversion, tree rendering, i18n
- **Integration**: Mock device data to test full IPC flow (Worker → Main → Renderer)

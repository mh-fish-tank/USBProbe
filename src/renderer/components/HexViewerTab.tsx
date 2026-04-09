import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { USBDevice } from '../../shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Base = 'hex' | 'dec' | 'bin' | 'oct'

interface DescriptorFieldInfo {
  name: string
  offset: number
  size: number
  colorIndex: number
}

// ─── Device Descriptor Field Map ─────────────────────────────────────────────

const DEVICE_DESCRIPTOR_FIELDS: DescriptorFieldInfo[] = [
  { name: 'bLength',            offset: 0,  size: 1, colorIndex: 0 },
  { name: 'bDescriptorType',    offset: 1,  size: 1, colorIndex: 1 },
  { name: 'bcdUSB',             offset: 2,  size: 2, colorIndex: 2 },
  { name: 'bDeviceClass',       offset: 4,  size: 1, colorIndex: 3 },
  { name: 'bDeviceSubClass',    offset: 5,  size: 1, colorIndex: 3 },
  { name: 'bDeviceProtocol',    offset: 6,  size: 1, colorIndex: 3 },
  { name: 'bMaxPacketSize0',    offset: 7,  size: 1, colorIndex: 4 },
  { name: 'idVendor',           offset: 8,  size: 2, colorIndex: 5 },
  { name: 'idProduct',          offset: 10, size: 2, colorIndex: 6 },
  { name: 'bcdDevice',          offset: 12, size: 2, colorIndex: 2 },
  { name: 'iManufacturer',      offset: 14, size: 1, colorIndex: 7 },
  { name: 'iProduct',           offset: 15, size: 1, colorIndex: 7 },
  { name: 'iSerialNumber',      offset: 16, size: 1, colorIndex: 7 },
  { name: 'bNumConfigurations', offset: 17, size: 1, colorIndex: 8 },
]

// ─── Exported Utility Functions ───────────────────────────────────────────────

export function formatByte(byte: number, base: Base): string {
  switch (base) {
    case 'hex': return byte.toString(16).toUpperCase().padStart(2, '0')
    case 'dec': return byte.toString(10).padStart(3, '0')
    case 'bin': return byte.toString(2).padStart(8, '0')
    case 'oct': return byte.toString(8).padStart(3, '0')
  }
}

export function formatRow(bytes: number[], base: Base): string[] {
  return bytes.map((b) => formatByte(b, base))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldForOffset(offset: number): DescriptorFieldInfo | null {
  for (const field of DEVICE_DESCRIPTOR_FIELDS) {
    if (offset >= field.offset && offset < field.offset + field.size) {
      return field
    }
  }
  return null
}

function fieldCssVar(colorIndex: number): string {
  return `var(--hex-field-${colorIndex})`
}

function isAsciiPrintable(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e
}

function getFieldValue(bytes: number[], field: DescriptorFieldInfo): number {
  // Little-endian read for multi-byte fields
  let val = 0
  for (let i = 0; i < field.size; i++) {
    const b = bytes[field.offset + i] ?? 0
    val |= b << (i * 8)
  }
  return val >>> 0
}

// ─── Styles helpers ───────────────────────────────────────────────────────────

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
    background: 'var(--bg-primary)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'var(--bg-titlebar)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  baseBtn: (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'background 0.12s, color 0.12s',
    fontFamily: 'inherit',
  }),
  copyBtn: {
    marginLeft: 'auto',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.12s',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  titleLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginLeft: 8,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  hexPane: {
    flex: 1,
    overflow: 'auto',
    padding: '10px 12px',
  },
  sidePane: {
    width: 240,
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    overflow: 'auto',
    background: 'var(--bg-secondary)',
    padding: '8px 0',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px 12px',
    padding: '8px 12px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    flexShrink: 0,
  },
}

// ─── HexRow ───────────────────────────────────────────────────────────────────

interface HexRowProps {
  rowIndex: number
  bytes: number[]
  base: Base
  hoveredField: string | null
  onHoverField: (name: string | null) => void
}

function HexRow({ rowIndex, bytes, base, hoveredField, onHoverField }: HexRowProps): React.ReactElement {
  const offsetLabel = (rowIndex * 16).toString(16).toUpperCase().padStart(4, '0')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0,
        marginBottom: 2,
        lineHeight: 1.6,
      }}
    >
      {/* Offset */}
      <span
        style={{
          color: 'var(--text-muted)',
          fontSize: 11,
          minWidth: 44,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {offsetLabel}
      </span>

      {/* Hex bytes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 2px', flex: 1 }}>
        {bytes.map((byte, i) => {
          const absoluteOffset = rowIndex * 16 + i
          const field = getFieldForOffset(absoluteOffset)
          const color = field ? fieldCssVar(field.colorIndex) : 'var(--text-primary)'
          const isHovered = field != null && hoveredField === field.name
          const formatted = formatByte(byte, base)

          return (
            <span
              key={i}
              style={{
                color,
                fontSize: 11,
                padding: '1px 3px',
                borderRadius: 'var(--radius-sm)',
                background: isHovered ? `color-mix(in srgb, ${color} 18%, transparent)` : 'transparent',
                cursor: field ? 'default' : 'default',
                transition: 'background 0.1s',
                userSelect: 'text',
              }}
              onMouseEnter={() => field && onHoverField(field.name)}
              onMouseLeave={() => onHoverField(null)}
              title={field ? `${field.name} @ offset ${absoluteOffset}` : `offset ${absoluteOffset}`}
            >
              {formatted}
            </span>
          )
        })}

        {/* Padding for incomplete last row */}
        {Array.from({ length: 16 - bytes.length }).map((_, i) => (
          <span key={`pad-${i}`} style={{ fontSize: 11, padding: '1px 3px', color: 'transparent', userSelect: 'none' }}>
            {base === 'bin' ? '00000000' : base === 'hex' ? '00' : '000'}
          </span>
        ))}
      </div>

      {/* ASCII */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          paddingLeft: 12,
          flexShrink: 0,
          userSelect: 'text',
          minWidth: 130,
        }}
      >
        {bytes.map((byte, i) => {
          const absoluteOffset = rowIndex * 16 + i
          const field = getFieldForOffset(absoluteOffset)
          const isHovered = field != null && hoveredField === field.name
          const char = isAsciiPrintable(byte) ? String.fromCharCode(byte) : '.'
          const color = field ? fieldCssVar(field.colorIndex) : 'var(--text-muted)'
          return (
            <span
              key={i}
              style={{
                color: isHovered ? color : isAsciiPrintable(byte) ? 'var(--text-secondary)' : 'var(--text-muted)',
                transition: 'color 0.1s',
              }}
              onMouseEnter={() => field && onHoverField(field.name)}
              onMouseLeave={() => onHoverField(null)}
            >
              {char}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── FieldInterpretation Panel ─────────────────────────────────────────────────

interface FieldInterpretationProps {
  bytes: number[]
  hoveredField: string | null
  onHoverField: (name: string | null) => void
}

function FieldInterpretationPanel({ bytes, hoveredField, onHoverField }: FieldInterpretationProps): React.ReactElement {
  const { t } = useTranslation('descriptors')

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          padding: '0 12px 6px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 4,
          userSelect: 'none',
        }}
      >
        Field Interpretation
      </div>

      {DEVICE_DESCRIPTOR_FIELDS.map((field) => {
        const isHovered = hoveredField === field.name
        const color = fieldCssVar(field.colorIndex)
        const value = getFieldValue(bytes, field)
        const hexStr = `0x${value.toString(16).toUpperCase().padStart(field.size * 2, '0')}`
        const description = t(field.name, { defaultValue: '' })

        return (
          <div
            key={field.name}
            onMouseEnter={() => onHoverField(field.name)}
            onMouseLeave={() => onHoverField(null)}
            style={{
              padding: '6px 12px',
              background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
              cursor: 'default',
              transition: 'background 0.1s',
              borderLeft: `3px solid ${isHovered ? color : 'transparent'}`,
              marginBottom: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isHovered ? color : 'var(--text-primary)',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  transition: 'color 0.1s',
                }}
              >
                {field.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                +{field.offset}
              </span>
            </div>

            <div style={{ paddingLeft: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--yellow)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                {hexStr}{' '}
                <span style={{ color: 'var(--text-muted)' }}>= {value}</span>
              </div>
              {description && (
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    marginTop: 2,
                    lineHeight: 1.4,
                    fontFamily: 'inherit',
                  }}
                >
                  {description}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

interface LegendProps {
  hoveredField: string | null
  onHoverField: (name: string | null) => void
}

function Legend({ hoveredField, onHoverField }: LegendProps): React.ReactElement {
  // Deduplicate by name (some share colorIndex)
  const seen = new Set<string>()
  const unique = DEVICE_DESCRIPTOR_FIELDS.filter((f) => {
    if (seen.has(f.name)) return false
    seen.add(f.name)
    return true
  })

  return (
    <div style={styles.legend}>
      {unique.map((field) => {
        const color = fieldCssVar(field.colorIndex)
        const isHovered = hoveredField === field.name
        return (
          <span
            key={field.name}
            onMouseEnter={() => onHoverField(field.name)}
            onMouseLeave={() => onHoverField(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              color: isHovered ? color : 'var(--text-muted)',
              cursor: 'default',
              transition: 'color 0.1s',
              fontWeight: isHovered ? 600 : 400,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {field.name}
          </span>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface HexViewerTabProps {
  device: USBDevice
}

export function HexViewerTab({ device }: HexViewerTabProps): React.ReactElement {
  const [base, setBase] = useState<Base>('hex')
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const rawBytes = device.rawDescriptor ?? []

  // Split into 16-byte rows
  const rows: number[][] = []
  for (let i = 0; i < rawBytes.length; i += 16) {
    rows.push(rawBytes.slice(i, i + 16))
  }

  const handleHoverField = useCallback((name: string | null) => {
    setHoveredField(name)
  }, [])

  const handleCopy = useCallback(() => {
    const lines = rows
      .map((row, ri) => {
        const offset = (ri * 16).toString(16).toUpperCase().padStart(4, '0')
        const cells = formatRow(row, base).join(' ')
        return `${offset}  ${cells}`
      })
      .join('\n')
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [rows, base])

  const BASE_OPTIONS: Base[] = ['hex', 'dec', 'bin', 'oct']
  const BASE_LABELS: Record<Base, string> = { hex: 'HEX', dec: 'DEC', bin: 'BIN', oct: 'OCT' }

  if (rawBytes.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        No raw descriptor data available
      </div>
    )
  }

  return (
    <div style={styles.root}>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div style={styles.toolbar}>
        {BASE_OPTIONS.map((b) => (
          <button
            key={b}
            style={styles.baseBtn(base === b)}
            onClick={() => setBase(b)}
            onMouseEnter={(e) => {
              if (base !== b) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
            }}
            onMouseLeave={(e) => {
              if (base !== b) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)'
            }}
          >
            {BASE_LABELS[b]}
          </button>
        ))}

        <span style={styles.titleLabel}>Device Descriptor</span>

        <button
          style={{
            ...styles.copyBtn,
            color: copied ? 'var(--success)' : 'var(--text-secondary)',
            borderColor: copied ? 'var(--success)' : 'var(--border)',
          }}
          onClick={handleCopy}
          onMouseEnter={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)'
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div style={styles.body}>
        {/* Hex dump pane */}
        <div style={styles.hexPane}>
          {/* Column header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: '1px solid var(--border)',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 44 }}>Offset</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flex: 1 }}>
              {Array.from({ length: 16 }, (_, i) => i.toString(16).toUpperCase().padStart(2, '0')).join('  ')}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 12, minWidth: 130 }}>
              ASCII
            </span>
          </div>

          {rows.map((row, ri) => (
            <HexRow
              key={ri}
              rowIndex={ri}
              bytes={row}
              base={base}
              hoveredField={hoveredField}
              onHoverField={handleHoverField}
            />
          ))}
        </div>

        {/* Field interpretation side panel */}
        <div style={styles.sidePane}>
          <FieldInterpretationPanel
            bytes={rawBytes}
            hoveredField={hoveredField}
            onHoverField={handleHoverField}
          />
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <Legend hoveredField={hoveredField} onHoverField={handleHoverField} />
    </div>
  )
}

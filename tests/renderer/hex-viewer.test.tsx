import { describe, it, expect } from 'vitest'
import { formatByte } from '../../src/renderer/components/HexViewerTab'

describe('HexViewerTab utilities', () => {
  it('formats a byte as hex', () => {
    expect(formatByte(0x0A, 'hex')).toBe('0A')
    expect(formatByte(255, 'hex')).toBe('FF')
    expect(formatByte(0, 'hex')).toBe('00')
  })

  it('formats a byte as decimal', () => {
    expect(formatByte(0x0A, 'dec')).toBe('010')
    expect(formatByte(255, 'dec')).toBe('255')
  })

  it('formats a byte as binary', () => {
    expect(formatByte(0x0A, 'bin')).toBe('00001010')
    expect(formatByte(255, 'bin')).toBe('11111111')
  })

  it('formats a byte as octal', () => {
    expect(formatByte(0x0A, 'oct')).toBe('012')
    expect(formatByte(255, 'oct')).toBe('377')
  })
})

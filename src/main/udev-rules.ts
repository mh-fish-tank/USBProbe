import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { UdevRule } from '../shared/types'
import { tmpdir } from 'os'

const UDEV_DIR = '/etc/udev/rules.d'
const RULE_FILE_PREFIX = '99-usbprobe'
const MANAGED_COMMENT = '# managed-by-usbprobe'

function parseRuleLine(line: string, filename: string): UdevRule | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const rule: UdevRule = {
    id: uuidv4(),
    filename,
    rawRule: line,
    managedByUSBProbe: true
  }

  // Parse ATTRS{idVendor}
  const vendorMatch = trimmed.match(/ATTRS\{idVendor\}=="([0-9a-fA-F]+)"/)
  if (vendorMatch) {
    rule.matchVendor = parseInt(vendorMatch[1], 16)
  }

  // Parse ATTRS{idProduct}
  const productMatch = trimmed.match(/ATTRS\{idProduct\}=="([0-9a-fA-F]+)"/)
  if (productMatch) {
    rule.matchProduct = parseInt(productMatch[1], 16)
  }

  // Parse MODE
  const modeMatch = trimmed.match(/MODE="([^"]+)"/)
  if (modeMatch) {
    rule.actionMode = modeMatch[1]
  }

  // Parse GROUP
  const groupMatch = trimmed.match(/GROUP="([^"]+)"/)
  if (groupMatch) {
    rule.actionGroup = groupMatch[1]
  }

  // Parse SYMLINK
  const symlinkMatch = trimmed.match(/SYMLINK\+="([^"]+)"/)
  if (symlinkMatch) {
    rule.actionSymlink = symlinkMatch[1]
  }

  // Parse RUN
  const runMatch = trimmed.match(/RUN\+="([^"]+)"/)
  if (runMatch) {
    rule.actionRun = runMatch[1]
  }

  return rule
}

export function listUdevRules(): UdevRule[] {
  const rules: UdevRule[] = []

  if (!existsSync(UDEV_DIR)) return rules

  let files: string[]
  try {
    files = readdirSync(UDEV_DIR).filter(
      (f) => f.startsWith(RULE_FILE_PREFIX) && f.endsWith('.rules')
    )
  } catch {
    return rules
  }

  for (const filename of files) {
    const filePath = join(UDEV_DIR, filename)
    try {
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const parsed = parseRuleLine(line, filename)
        if (parsed) rules.push(parsed)
      }
    } catch {
      // skip unreadable files
    }
  }

  return rules
}

function buildRuleString(
  rule: Omit<UdevRule, 'id' | 'filename' | 'rawRule' | 'managedByUSBProbe'>
): string {
  const parts: string[] = ['SUBSYSTEM=="usb"']

  if (rule.matchVendor !== undefined) {
    parts.push(`ATTRS{idVendor}=="${rule.matchVendor.toString(16).padStart(4, '0')}"`)
  }
  if (rule.matchProduct !== undefined) {
    parts.push(`ATTRS{idProduct}=="${rule.matchProduct.toString(16).padStart(4, '0')}"`)
  }
  if (rule.matchDeviceClass !== undefined) {
    parts.push(`ATTRS{bDeviceClass}=="${rule.matchDeviceClass.toString(16).padStart(2, '0')}"`)
  }
  if (rule.matchSerial) {
    parts.push(`ATTRS{serial}=="${rule.matchSerial}"`)
  }
  if (rule.actionMode) {
    parts.push(`MODE="${rule.actionMode}"`)
  }
  if (rule.actionGroup) {
    parts.push(`GROUP="${rule.actionGroup}"`)
  }
  if (rule.actionSymlink) {
    parts.push(`SYMLINK+="${rule.actionSymlink}"`)
  }
  if (rule.actionRun) {
    parts.push(`RUN+="${rule.actionRun}"`)
  }

  return parts.join(', ')
}

function writeRuleWithPkexec(destPath: string, content: string): void {
  const tmpFile = join(tmpdir(), `usbprobe-rule-${Date.now()}.rules`)
  writeFileSync(tmpFile, content, 'utf8')
  try {
    execSync(`pkexec cp "${tmpFile}" "${destPath}"`, { stdio: 'inherit' })
    execSync('pkexec udevadm control --reload-rules', { stdio: 'inherit' })
  } finally {
    try {
      require('fs').unlinkSync(tmpFile)
    } catch {}
  }
}

export function addUdevRule(
  rule: Omit<UdevRule, 'id' | 'filename' | 'rawRule' | 'managedByUSBProbe'>
): void {
  const ruleString = buildRuleString(rule)
  const id = uuidv4()
  const filename = `${RULE_FILE_PREFIX}-${id.slice(0, 8)}.rules`
  const destPath = join(UDEV_DIR, filename)

  const content = `${MANAGED_COMMENT}\n${ruleString}\n`
  writeRuleWithPkexec(destPath, content)
}

export function removeUdevRule(id: string): void {
  // Since we store rules in separate files per add, we need to find by content
  // In this implementation rules are identified by their raw line containing the id
  // We'll scan all managed files and remove empty ones
  if (!existsSync(UDEV_DIR)) return

  let files: string[]
  try {
    files = readdirSync(UDEV_DIR).filter(
      (f) => f.startsWith(RULE_FILE_PREFIX) && f.endsWith('.rules')
    )
  } catch {
    return
  }

  for (const filename of files) {
    const filePath = join(UDEV_DIR, filename)
    try {
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      const filtered = lines.filter((line) => {
        const parsed = parseRuleLine(line, filename)
        return parsed === null || parsed.id !== id
      })

      if (filtered.length !== lines.length) {
        const newContent = filtered.join('\n')
        writeRuleWithPkexec(filePath, newContent)
        return
      }
    } catch {
      // skip
    }
  }
}

export function installPermissionRule(): boolean {
  const filename = `${RULE_FILE_PREFIX}-permissions.rules`
  const destPath = join(UDEV_DIR, filename)

  const content = [
    MANAGED_COMMENT,
    'SUBSYSTEM=="usb", MODE="0664", GROUP="plugdev"',
    ''
  ].join('\n')

  try {
    writeRuleWithPkexec(destPath, content)
    return true
  } catch (e) {
    console.error('Failed to install permission rule:', e)
    return false
  }
}

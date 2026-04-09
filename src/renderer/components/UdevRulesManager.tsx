import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { api } from '../hooks/use-usb-api'
import type { UdevRule } from '../../shared/types'

interface AddForm {
  vid: string
  pid: string
  mode: string
  group: string
}

const EMPTY_FORM: AddForm = { vid: '', pid: '', mode: '0664', group: 'plugdev' }

export function UdevRulesManager(): React.ReactElement {
  const { t } = useTranslation('common')
  const [rules, setRules] = useState<UdevRule[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function loadRules(): Promise<void> {
    try {
      const result = await api.listUdevRules()
      setRules(result)
    } catch (_e) {
      // ignore
    }
  }

  useEffect(() => {
    loadRules()
  }, [])

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await api.addUdevRule({
        matchVendor: form.vid ? parseInt(form.vid, 16) : undefined,
        matchProduct: form.pid ? parseInt(form.pid, 16) : undefined,
        actionMode: form.mode || undefined,
        actionGroup: form.group || undefined
      })
      setForm(EMPTY_FORM)
      setShowAdd(false)
      await loadRules()
    } catch (_e) {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await api.removeUdevRule(id)
      await loadRules()
    } catch (_e) {
      // ignore
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {t('settings.udevRules')}
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: showAdd ? 'var(--surface1)' : 'var(--accent)',
            color: showAdd ? 'var(--text-secondary)' : 'var(--bg-primary)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'background 0.15s'
          }}
        >
          <Icon icon={showAdd ? 'mdi:close' : 'mdi:plus'} style={{ fontSize: 13 }} />
          {showAdd ? t('actions.cancel') : t('actions.add')}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(
              [
                { key: 'vid', label: 'VID (hex)', placeholder: 'e.g. 1d6b' },
                { key: 'pid', label: 'PID (hex)', placeholder: 'e.g. 0002' },
                { key: 'mode', label: 'MODE', placeholder: '0664' },
                { key: 'group', label: 'GROUP', placeholder: 'plugdev' }
              ] as { key: keyof AddForm; label: string; placeholder: string }[]
            ).map(({ key, label, placeholder }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </span>
                <input
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--surface2)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    padding: '4px 8px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--surface2)',
                background: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              {t('actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                opacity: saving ? 0.7 : 1
              }}
            >
              {t('actions.save')}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div
          style={{
            padding: '16px 0',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12
          }}
        >
          No udev rules configured.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px'
              }}
            >
              <span
                className="mono"
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {rule.rawRule}
              </span>
              <button
                onClick={() => handleDelete(rule.id)}
                title={t('actions.delete')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Icon icon="mdi:trash-can-outline" style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

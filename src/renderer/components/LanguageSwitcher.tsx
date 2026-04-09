import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'

const LANGUAGES = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' }
]

export function LanguageSwitcher(): React.ReactElement {
  const { i18n: i18nHook } = useTranslation()
  const [current, setCurrent] = useState(i18nHook.language)

  function handleChange(code: string): void {
    i18n.changeLanguage(code)
    localStorage.setItem('usbprobe-lang', code)
    setCurrent(code)
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {LANGUAGES.map((lang) => {
        const isActive = current === lang.code || (lang.code === 'zh-CN' && current.startsWith('zh'))
        return (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            style={{
              padding: '4px 14px',
              borderRadius: 'var(--radius-sm)',
              border: isActive
                ? '1px solid var(--accent)'
                : '1px solid var(--surface2)',
              background: isActive ? 'rgba(137,180,250,0.15)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s'
            }}
          >
            {lang.label}
          </button>
        )
      })}
    </div>
  )
}

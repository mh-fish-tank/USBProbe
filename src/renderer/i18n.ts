import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '../locales/en/common.json'
import enDevices from '../locales/en/devices.json'
import enDescriptors from '../locales/en/descriptors.json'
import zhCNCommon from '../locales/zh-CN/common.json'
import zhCNDevices from '../locales/zh-CN/devices.json'
import zhCNDescriptors from '../locales/zh-CN/descriptors.json'

i18n
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('usbprobe-lang') || 'zh-CN',
    fallbackLng: 'en',
    defaultNS: 'common',
    resources: {
      en: {
        common: enCommon,
        devices: enDevices,
        descriptors: enDescriptors
      },
      'zh-CN': {
        common: zhCNCommon,
        devices: zhCNDevices,
        descriptors: zhCNDescriptors
      }
    },
    interpolation: {
      escapeValue: false
    }
  })

export default i18n

import i18n from 'i18n'

import { Locale } from 'discord.js'

import { Logger } from '#common/logger'
import { Language } from '#src/types'

const logger = new Logger()

export function initI18n() {
  i18n.configure({
    locales: Object.keys(Language),
    defaultLocale: 'PortugueseBR',
    directory: `${process.cwd()}/locales`,
    retryInDefaultLocale: true,
    objectNotation: true,
    register: global,
    logWarnFn: console.warn,
    logErrorFn: console.error,
    missingKeyFn: (_locale, value) => {
      return value
    },
    mustacheConfig: {
      tags: ['{', '}'],
      disable: false,
    },
  })

  logger.info('I18n has been initialized')
}

export { i18n }

export function T(locale: string, text: string | i18n.TranslateOptions, ...params: any) {
  i18n.setLocale(locale)
  return i18n.__mf(text, ...params)
}

export function localization(lan: keyof typeof Locale, name: any, desc: any) {
  return {
    name: [Locale[lan], name],
    description: [Locale[lan], T(lan, desc)],
  }
}

export function descriptionLocalization(name: any, text: any) {
  return i18n.getLocales().map((locale: string) => {
    // Check if the locale is a valid key of the Locale enum
    if (locale in Locale) {
      const localeValue = Locale[locale as keyof typeof Locale]
      return localization(localeValue as any, name, text)
    }
    // If locale is not in the enum, handle it accordingly
    return localization(locale as any, name, text) // You can choose how to handle this case
  })
}

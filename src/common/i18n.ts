import i18n from 'i18n'

import { Locale } from 'discord.js'

import { Logger } from '#src/lib/logger'
import { Language } from '#src/types'
import { env } from '#src/env'

const logger = new Logger()

export function initI18n() {
  i18n.configure({
    locales: Object.keys(Language),
    defaultLocale: env.DEFAULT_LANGUAGE,
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

export function T(
  locale: string = Language.EnglishUS,
  text: string | i18n.TranslateOptions,
  ...params: any
) {
  i18n.setLocale(locale)
  return i18n.__mf(text, ...params)
}

export function localization(lan: any, name: any, desc: any) {
  return {
    // @ts-ignore
    name: [Locale[lan], name],
    // @ts-ignore
    description: [Locale[lan], T(lan, desc)],
  }
}

export function descriptionLocalization(name: any, text: any) {
  // @ts-ignore
  return i18n.getLocales().map((locale) => localization(Locale[locale] || locale, name, text))
}

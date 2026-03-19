import i18n from 'i18n'

import { Locale } from 'discord.js'

import { Logger } from '#common/logger'
import { Language } from '#src/types'

const logger = new Logger()
type TranslationInput = string | i18n.TranslateOptions

export interface LocalizationEntry {
  locale: string
  name: string
  description: string
}

function resolveDiscordLocale(locale: string): string {
  if (locale in Locale) {
    return Locale[locale as keyof typeof Locale]
  }

  return locale
}

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

export function T(locale: string, text: TranslationInput, ...params: unknown[]) {
  i18n.setLocale(locale)
  return i18n.__mf(text, ...params)
}

export function localization(
  locale: string,
  name: string,
  desc: TranslationInput
): LocalizationEntry {
  const discordLocale = resolveDiscordLocale(locale)

  return {
    locale: discordLocale,
    name,
    description: T(locale, desc),
  }
}

export function descriptionLocalization(name: string, text: TranslationInput): LocalizationEntry[] {
  return i18n.getLocales().map((locale) => localization(locale, name, text))
}

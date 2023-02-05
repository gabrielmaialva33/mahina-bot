import { I18n } from '@grammyjs/i18n'

import { Context } from '@/bot/types/context'

export const i18n = new I18n<Context>({
  defaultLocale: 'pt',
  directory: 'locales',
  fluentBundleOptions: { useIsolating: false },
  localeNegotiator: (ctx) => ctx.scope.user?.language_code ?? undefined,
})

export const isMultipleLocales = i18n.locales.length > 1

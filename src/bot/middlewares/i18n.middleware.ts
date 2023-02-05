import { Middleware } from 'grammy'

import { Context } from '@/bot/types'
import { i18n as i18nProvider } from '@/bot/core'

export const i18n = (): Middleware<Context> => i18nProvider

import { Context as DefaultContext } from 'grammy'
import { HydrateFlavor } from '@grammyjs/hydrate'
import { I18nFlavor } from '@grammyjs/i18n'
import { ParseModeFlavor } from '@grammyjs/parse-mode'

import { UserModel } from '@/models/user.model'
import { Logger } from '@/libs/pino/logger.pino'

export interface ContextScope {
  user?: UserModel
}

export interface ExtendedContextFlavor {
  scope: ContextScope
  logger: Logger
}

export type ContextScopeWith<P extends keyof ContextScope> = Record<
  'scope',
  Record<P, NonNullable<ContextScope[P]>>
>

export type Context = ParseModeFlavor<
  HydrateFlavor<DefaultContext & I18nFlavor & ExtendedContextFlavor>
>

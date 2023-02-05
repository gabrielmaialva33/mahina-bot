import { Composer, InputFile } from 'grammy'
import { Context } from '@/bot/types'

import { Logger } from '@/libs/pino/logger.pino'
import { i18n } from '@/bot/core'

import { ContextUtils } from '@/bot/helpers/context.utils'
import { StartMarkup } from '@/bot/markups'

const composer = new Composer<Context>()

composer.use(StartMarkup)

composer.command('start', async (ctx) => {
  if (!ctx.chat?.id) return
  if (ctx.chat.type === 'supergroup') return

  Logger.info(`Bot has been started by: ${ContextUtils.get_username(ctx)}`, 'commands')

  await ctx.api.sendChatAction(ctx.chat.id, 'typing')

  const file = new InputFile(process.cwd() + '/assets/animations/mahina_welcome.gif')
  return ctx.replyWithAnimation(file, {
    caption: i18n.t('pt', 'welcome'),
    reply_markup: StartMarkup,
    thumb: new InputFile(process.cwd() + '/assets/images/mahina_welcome.png'),
  })
})

export default composer

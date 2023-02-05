import { Composer } from 'grammy'
import { Context } from '@/bot/types'
import { Mahina } from '@/bot/core'

const composer = new Composer<Context>()

composer.command('ping', async (ctx) => {
  await ctx.api.sendChatAction(ctx.chat.id, 'typing')

  const ping = await Mahina.ping()

  return ctx.reply(`Pong! ${ping}ms`)
})

export default composer

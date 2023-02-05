import { Bot as BotGrammy } from 'grammy'
import { hydrate } from '@grammyjs/hydrate'
import { hydrateReply, parseMode } from '@grammyjs/parse-mode'

import { EnvConfig } from '@/config/env.config'
import { Logger } from '@/libs/pino/logger.pino'

import { Context } from '@/bot/types'

import Commands from '@/bot/commands'
import { DateTime } from 'luxon'

export class Bot extends BotGrammy<Context> {
  constructor() {
    super(EnvConfig.BOT_TOKEN, { client: { canUseWebhookReply: () => false } })

    this.api.config.use(parseMode('HTML'))

    this.use(hydrateReply)
    this.use(hydrate())

    this.use(Commands)

    this.catch = (err) => Logger.error(err, 'bot')
  }

  public async start() {
    await this.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'ping', description: 'Ping the bot' },
    ])

    await super.start({
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
      onStart: () => Logger.info('Bot started', 'Bot'),
    })
  }

  public async ping() {
    const start = DateTime.local()
    await this.api.getMe()
    const end = DateTime.local()

    return end.diff(start, 'milliseconds').milliseconds
  }
}

export const Mahina = new Bot()

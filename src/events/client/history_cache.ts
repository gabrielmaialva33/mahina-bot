import { Message } from 'discord.js'

import { BaseClient, Event } from '#common/index'
import { HistoryUtils } from '#utils/history.utils'

export default class HistoryCache extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'messageCreate' })
  }

  async run(message: Message): Promise<any> {
    if (!message.guildId) return
    // if (message.guildId !== this.client.env.BOT_AI_GUILD_ID) return
    if (!this.client.env.BOT_AI_GUILD_IDS.includes(message.guildId)) return

    // ignore messages from bots, messages with the bot prefix, messages starting with '!', messages with attachments, embeds, system messages, and system users
    if (message.content.startsWith(this.client.env.DISC_BOT_PREFIX)) return
    if (message.content.includes('http')) return
    if (message.content.match(/<.*>/)) return
    if (message.content.startsWith('!')) return

    if (message.attachments.size > 0) return
    if (message.embeds.length > 0) return

    if (message.author.system) return
    if (message.author.bot) return

    if (message.content.match(/winx/gi)) return

    const replyMessageId = message.reference?.messageId
    if (replyMessageId) {
      const replyMessage = await message.channel.messages.fetch(replyMessageId)
      if (replyMessage.author.id === this.client.user!.id) return
    }

    // save the message in the cache
    const memberName = message.member?.nickname || message.author.username
    if (!memberName) return

    let historyMessage = ''
    if (replyMessageId) {
      try {
        const replyMessage = await message.channel.messages.fetch(replyMessageId)
        const replyMemberName = replyMessage.member?.nickname || replyMessage.author.username

        historyMessage = HistoryUtils.build_chat_history({
          text: message.content,
          username: memberName,
          reply_to_username: replyMemberName,
        })
      } catch (error) {
        this.client.logger.error('error fetching reply message', error)
      }
    } else {
      historyMessage = HistoryUtils.build_chat_history({
        text: message.content,
        username: memberName,
      })
    }

    // save the message in the cache
    HistoryUtils.write_history(historyMessage)
    this.client.logger.info('history message saved', 'history.cache')
  }
}

import { BaseClient, Event } from '#common/index'
import { Message } from 'discord.js'
import { ContextUtils } from '#utils/context.utils'
import { GptUtils } from '#utils/gpt.utils'
import { HistoryUtils } from '#utils/history.utils'

export default class ChatBot extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'messageCreate' })
  }

  async run(message: Message): Promise<any> {
    this.client.logger.info('ChatBot event triggered')

    if (message.author.bot) return
    if (!message.guildId) return
    if (!this.client.env.BOT_AI_GUILD_IDS.includes(message.guildId)) return

    // if user mention winx and not reply to a message
    const regex = /winx/gi
    if (regex.test(message.content) && !message.reference) {
      const textMessage = ContextUtils.get_text(message)
      if (!textMessage) return

      const { username, text } = ContextUtils.get_context(message)

      const input = GptUtils.build_input({ text, username })

      const randomChoice = await this.response(message, input, username)
      if (!randomChoice) return

      const history = HistoryUtils.build_gpt_history(input, randomChoice, username)
      HistoryUtils.write_history(history)

      return message.reply(`***${randomChoice}***`)
    }

    // if the message is a reply to a message from the bot and does not include '/'
    const replyMessageId = message.reference?.messageId
    if (replyMessageId) {
      const replyMessage = await message.channel.messages.fetch(replyMessageId)
      if (replyMessage.author.id === this.client.user!.id) {
        const textMessage = ContextUtils.get_text(message)
        if (!textMessage) return

        const { username } = ContextUtils.get_context(message)

        const input = GptUtils.build_input({
          text: textMessage,
          username,
        })

        const randomChoice = await this.response(message, input, username)
        if (!randomChoice) return

        const history = HistoryUtils.build_gpt_history(input, randomChoice, username)
        HistoryUtils.write_history(history)

        return message.reply(`***${randomChoice}***`)
      }
    }
  }

  private async response(message: Message, input: any, username: string) {
    if (!message.guildId || !message.content) return null

    const response = await this.client.ai.complete(input, username)
    // @ts-ignore
    if (response['choices'].length === 0) return null

    // @ts-ignore
    const choices = response['choices']
    const random = Math.floor(Math.random() * choices.length)
    return choices[random].text
  }
}

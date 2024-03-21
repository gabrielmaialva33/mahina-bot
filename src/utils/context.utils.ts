import { Message } from 'discord.js'

import { StringUtils } from '#utils/string.utils'

export const ContextUtils = {
  get_username: (message: Message) => {
    if (!message.content) return

    const from = message.author.username
    if (!from) return 'no_username'

    return StringUtils.NormalizeName(from)
  },

  get_name: (message: Message) => {
    if (!message.content) return

    const from = message.member?.nickname || message.author.username
    if (!from) return 'no_username'

    return StringUtils.NormalizeName(from)
  },

  get_reply_to_username: (message: Message) => {
    const reply = message.reference?.messageId
    if (!reply) return

    const replyMessage = message.channel.messages.cache.get(reply)
    if (!replyMessage) return

    const replyFrom = replyMessage.member?.nickname || replyMessage.author.username
    return StringUtils.NormalizeName(replyFrom)
  },

  get_text: (message: Message) => {
    const text = message.content
    if (!text) return

    return StringUtils.NormalizeText(text)
  },

  get_reply_to_text: (message: Message) => {
    const reply = message.reference?.messageId
    if (!reply) return

    const replyMessageId = message.reference?.messageId
    if (!replyMessageId) return

    const replyMessage = message.channel.messages.cache.get(replyMessageId)
    if (!replyMessage) return

    const replyText = replyMessage.content
    return StringUtils.NormalizeText(replyText)
  },

  get_context: (message: Message): ContextArgs => {
    const username = ContextUtils.get_name(message)!
    const text = ContextUtils.get_text(message)!

    const replyToUsername = ContextUtils.get_reply_to_username(message)
    const replyToText = ContextUtils.get_reply_to_text(message)

    return {
      username,
      replyToUsername,
      text,
      replyToText,
    }
  },
}

export interface ContextArgs {
  username: string
  replyToUsername?: string
  text: string
  replyToText?: string
}

import { TextChannel } from 'discord.js'

import { BaseClient } from '#common/base_client'

export default class BotLog {
  static send(client: BaseClient, message: string, type: string): void {
    if (!client) return
    if (!client.channels.cache) return
    if (!client.env.DISC_LOG_CHANNEL_ID) return

    const channel = client.channels.cache.get(client.env.DISC_LOG_CHANNEL_ID) as TextChannel
    if (!channel) return

    let color: string | number | readonly [red: number, green: number, blue: number]
    switch (type) {
      case 'error':
        color = 0xff0000
        break
      case 'warn':
        color = 0xffff00
        break
      case 'info':
        color = 0x00ff00
        break
      case 'success':
        color = 0x00ff00
        break
      default:
        color = 0x000000
        break
    }
    const embed = client.embed().setColor(color).setDescription(message).setTimestamp()

    channel.send({ embeds: [embed] }).catch(() => {
      client.logger.error('Failed to send message to log channel')
    })
  }
}

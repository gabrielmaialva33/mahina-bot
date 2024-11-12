import type { TextChannel } from 'discord.js'
import type { Player } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

import { updateSetup } from '#utils/setup_system'

export default class PlayerDestroy extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'playerDestroy',
    })
  }

  async run(player: Player, _reason: string): Promise<void> {
    const guild = this.client.guilds.cache.get(player.guildId)
    if (!guild) return
    const locale = await this.client.db.getLanguage(player.guildId)
    await updateSetup(this.client, guild, locale)

    const messageId = player.get<string | undefined>('messageId')
    if (!messageId) return

    const channel = guild.channels.cache.get(player.textChannelId!) as TextChannel
    if (!channel) return

    const message = await channel.messages.fetch(messageId).catch(() => {
      null
    })
    if (!message) return

    if (message.editable) {
      await message.edit({ components: [] }).catch(() => {
        null
      })
    }
  }
}
import type { TextChannel } from 'discord.js'
import type { Player, Track, TrackStartEvent } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class TrackEnd extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'trackEnd',
    })
  }

  async run(player: Player, _track: Track | null, _payload: TrackStartEvent): Promise<void> {
    const guild = this.client.guilds.cache.get(player.guildId)
    if (!guild) return

    const messageId = player.get<string | undefined>('messageId')
    if (!messageId) return

    const channel = guild.channels.cache.get(player.textChannelId!) as TextChannel
    if (!channel) return

    const message = await channel.messages.fetch(messageId).catch(() => {
      null
    })
    if (!message) return

    message.delete().catch(() => {
      null
    })
  }
}

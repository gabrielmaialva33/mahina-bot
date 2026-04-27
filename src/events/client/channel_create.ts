import { TextChannel } from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class ChannelCreate extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'channelCreate',
    })
  }

  async run(channel: unknown): Promise<void> {
    this.client.services.serverAwareness?.observeChannelCreate(channel)

    if (channel instanceof TextChannel && this.client.services.proactiveInteraction) {
      await this.client.services.proactiveInteraction.handleChannelCreate(channel)
    }
    if (channel instanceof TextChannel && this.client.services.ambientPresence) {
      await this.client.services.ambientPresence.sendChannelSpark(channel)
    }
  }
}

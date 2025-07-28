import { TextChannel } from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class ChannelCreate extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'channelCreate',
    })
  }

  async run(channel: any): Promise<void> {
    if (channel instanceof TextChannel && this.client.services.proactiveInteraction) {
      await this.client.services.proactiveInteraction.handleChannelCreate(channel)
    }
  }
}

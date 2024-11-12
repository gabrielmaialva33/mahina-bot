import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class ChannelDelete extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'channelDelete',
    })
  }

  async run(channel: any): Promise<void> {
    const { guild } = channel
    const setup = await this.client.db.getSetup(guild.id)
    const stay = await this.client.db.get_247(guild.id)

    if (Array.isArray(stay)) {
      for (const s of stay) {
        if (channel.type === 2 && s.voiceId === channel.id) {
          await this.client.db.delete_247(guild.id)
          break
        }
      }
    } else if (stay) {
      if (channel.type === 2 && stay.voiceId === channel.id) {
        await this.client.db.delete_247(guild.id)
      }
    }

    if (setup && channel.type === 0 && setup.textId === channel.id) {
      await this.client.db.deleteSetup(guild.id)
    }

    const player = this.client.manager.getPlayer(guild.id)
    if (player && player.voiceChannelId === channel.id) {
      player.destroy()
    }
  }
}

import { Event, Mahina } from '#common/index'
import BotLog from '#src/utils/bot_log'

export default class NodeConnect extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'nodeConnect' })
  }

  async run(node: string): Promise<void> {
    this.client.logger.success(`Node ${node} is ready!`)

    setTimeout(async () => {
      const guild = this.client.guilds.cache.get(this.client.env.DISC_GUILD_ID)
      if (!guild) return
      const channel = guild.channels.cache.get(this.client.env.DISC_LOG_CHANNEL_ID)
      if (!channel) return
      const vc = guild.channels.cache.get(this.client.env.DISC_VOICE_ID)
      if (!vc) return
      await this.client.queue.create(guild, vc, channel)
    }, 1000)

    BotLog.send(this.client, `Node ${node} is ready!`, 'success')
  }
}

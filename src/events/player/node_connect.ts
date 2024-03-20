import { Event, BaseClient } from '#common/index'
import BotLog from '#src/utils/bot_log'

export default class NodeConnect extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeConnect' })
  }

  async run(node: string): Promise<void> {
    this.client.logger.success(`Node ${node} is ready!`)

    const data = await this.client.db.get_247()
    if (!data) return

    for (const main of data) {
      const index = data.indexOf(main)
      setTimeout(async () => {
        const guild = this.client.guilds.cache.get(main.guild_id)
        if (!guild) return
        const channel = guild.channels.cache.get(main.text_id)
        if (!channel) return
        const vc = guild.channels.cache.get(main.voice_id)
        if (!vc) return
        await this.client.queue.create(guild, vc, channel)
      }, index * 1000)
    }

    BotLog.send(this.client, `Node ${node} is ready!`, 'success')
  }
}

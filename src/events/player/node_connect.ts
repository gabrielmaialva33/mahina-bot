import { BaseClient, Event } from '#common/index'
import BotLog from '#src/utils/bot_log'
import { Stay } from '@prisma/client'

export default class NodeConnect extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeConnect' })
  }

  async run(node: string): Promise<void> {
    this.client.logger.success(`Node ${node} is ready!`)

    const data = (await this.client.db.get_247()) as Stay[]
    if (!data) return

    for (const main of data) {
      const index = data.indexOf(main)
      setTimeout(async () => {
        const guild = this.client.guilds.cache.get(main.guildId)
        if (!guild) return
        const channel = guild.channels.cache.get(main.textId)
        if (!channel) return
        const vc = guild.channels.cache.get(main.voiceId)
        if (!vc) return
        await this.client.queue.create(guild, vc, channel)
      }, index * 1000)
    }

    BotLog.send(this.client, `Node ${node} is ready!`, 'success')
  }
}

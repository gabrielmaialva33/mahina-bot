import { AutoPoster } from 'topgg-autoposter'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'

export default class Ready extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'ready',
    })
  }

  async run(): Promise<void> {
    this.client.logger.success(`${this.client.user?.tag} is ready!`)

    this.client.user?.setPresence({
      activities: [
        {
          name: env.BOT_ACTIVITY,
          type: env.BOT_ACTIVITY_TYPE,
        },
      ],
      status: env.BOT_STATUS as any,
    })

    if (env.TOPGG) {
      const autoPoster = AutoPoster(env.TOPGG, this.client)
      setInterval(() => {
        autoPoster.on('posted', (_stats) => {
          null
        })
      }, 86400000) // 24 hours in milliseconds
    } else {
      this.client.logger.warn('Top.gg token not found. Skipping auto poster.')
    }
    const normalizedUsername = this.client.user?.username?.normalize('NFKD').replace(/[^\w]/g, '')
    await this.client.manager.init({
      ...this.client.user!,
      username: normalizedUsername,
      shards: 'auto',
    })

    // Start proactive interaction service
    if (this.client.services.proactiveInteraction) {
      await this.client.services.proactiveInteraction.start()
      this.client.logger.info('Proactive Interaction Service started')
    }

    // Start Lavalink health monitoring service
    if (this.client.services.lavalinkHealth) {
      this.client.services.lavalinkHealth.start()
      this.client.logger.info('Lavalink Health Service started')
    }
  }
}

import { AutoPoster } from 'topgg-autoposter'

import Event from '#common/event'
import { getAIBootSummary } from '#common/ai_runtime'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'

export default class Ready extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'clientReady',
    })
  }

  async run(): Promise<void> {
    this.client.logger.success(`${this.client.user?.tag} is ready!`)
    this.client.logger.info(`Runtime: ${getAIBootSummary(this.client).join(' | ')}`)

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
      autoPoster.on('posted', () => {
        this.client.logger.info('Top.gg stats posted successfully')
      })
      autoPoster.on('error', (err) => {
        this.client.logger.error('Top.gg AutoPoster error:', err)
      })
    } else {
      this.client.logger.warn('Top.gg token not found. Skipping auto poster.')
    }
    if (this.client.runtime.music) {
      const normalizedUsername = this.client.user?.username?.normalize('NFKD').replace(/[^\w]/g, '')

      await this.client.manager.init({
        ...this.client.user!,
        username: normalizedUsername,
        shards: 'auto',
      })
    } else {
      this.client.logger.info(
        'Skipping Lavalink manager initialization because music runtime is disabled'
      )
    }

    // Start proactive interaction service - DISABLED to reduce spam messages
    // if (this.client.services.proactiveInteraction) {
    //   await this.client.services.proactiveInteraction.start()
    //   this.client.logger.info('Proactive Interaction Service started')
    // }

    // Start Lavalink health monitoring service
    if (this.client.services.lavalinkHealth) {
      this.client.services.lavalinkHealth.start()
      this.client.logger.info('Lavalink Health Service started')
    }
  }
}

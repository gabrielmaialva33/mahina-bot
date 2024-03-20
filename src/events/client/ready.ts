import { Event, Mahina } from '#common/index'

export default class Ready extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'ready' })
  }

  async run(): Promise<void> {
    this.client.logger.success(`${this.client.user?.tag} is ready!`)

    this.client.user?.setPresence({
      activities: [
        {
          name: this.client.env.BOT_ACTIVITY,
          type: this.client.env.BOT_ACTIVITY_TYPE,
        },
      ],
      status: this.client.env.BOT_STATUS as any,
    })
  }
}

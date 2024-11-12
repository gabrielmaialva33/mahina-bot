import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class Raw extends Event {
  client: MahinaBot

  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'raw',
    })
    this.client = client
  }

  async run(d: any): Promise<void> {
    await this.client.manager.sendRawData(d)
  }
}

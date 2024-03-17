import { Event, Mahina } from '#common/index'

export default class NodeRaw extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'nodeRaw' })
  }

  async run(payload: any): Promise<void> {
    this.client.logger.debug(`Node raw event: ${JSON.stringify(payload)}`)
  }
}

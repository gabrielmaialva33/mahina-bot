import { BaseClient, Event } from '#common/index'

export default class NodeRaw extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeRaw' })
  }

  async run(payload: any): Promise<void> {
    this.client.logger.debug(`Node raw event: ${JSON.stringify(payload)}`)
  }
}

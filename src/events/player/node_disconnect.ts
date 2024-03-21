import { BaseClient, Event } from '#common/index'

import BotLog from '#src/utils/bot_log'

export default class NodeDisconnect extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeDisconnect' })
  }

  async run(node: string, count: number): Promise<void> {
    this.client.logger.warn(`Node ${node} disconnected ${count} times`)
    BotLog.send(this.client, `Node ${node} disconnected ${count} times`, 'warn')
  }
}

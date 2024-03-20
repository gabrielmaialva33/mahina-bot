import { Event, BaseClient } from '#common/index'

import BotLog from '#src/utils/bot_log'

export default class NodeReconnect extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeReconnect' })
  }

  async run(node: string): Promise<void> {
    this.client.logger.warn(`Node ${node} reconnected`)
    BotLog.send(this.client, `Node ${node} reconnected`, 'warn')
  }
}

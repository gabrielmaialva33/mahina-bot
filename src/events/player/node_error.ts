import { Event, BaseClient } from '#common/index'
import BotLog from '#src/utils/bot_log'

export default class NodeError extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeError' })
  }

  async run(node: string, error: any): Promise<void> {
    this.client.logger.error(`Node ${node} Error: ${JSON.stringify(error)}`)
    BotLog.send(this.client, `Node ${node} Error: ${JSON.stringify(error)}`, 'error')
  }
}

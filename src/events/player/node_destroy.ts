import { Event, BaseClient } from '#common/index'
import BotLog from '#src/utils/bot_log'

export default class NodeDestroy extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'nodeDestroy' })
  }

  async run(node: string, code: number, reason: string): Promise<void> {
    this.client.logger.error(`Node ${node} destroyed with code ${code} and reason ${reason}`)
    BotLog.send(
      this.client,
      `Node ${node} destroyed with code ${code} and reason ${reason}`,
      'error'
    )
  }
}

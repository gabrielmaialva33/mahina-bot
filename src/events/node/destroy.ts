import type { DestroyReasonsType, LavalinkNode } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

import { sendLog } from '#utils/bot_log'

export default class Destroy extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'destroy',
    })
  }

  async run(node: LavalinkNode, destroyReason?: DestroyReasonsType): Promise<void> {
    this.client.logger.success(`Node ${node.id} is destroyed!`)
    sendLog(this.client, `Node ${node.id} is destroyed: ${destroyReason}`, 'warn')
  }
}

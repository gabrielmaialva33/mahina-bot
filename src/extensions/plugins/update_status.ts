import type { BaseClient } from '#src/common/index'
import type { BotPlugin } from '#src/extensions/index'

const UpdateStatusPlugin: BotPlugin = {
  name: 'Update Status Plugin',
  version: '1.0.0',
  author: 'mrootx',
  initialize: (client: BaseClient) => {
    client.on('ready', () => client.utils.updateStatus(client))
  },
}

export default UpdateStatusPlugin

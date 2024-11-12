import type MahinaBot from '#common/mahina_bot'
import { type BotPlugin } from '#src/extensions/index'

const UpdateStatusPlugin: BotPlugin = {
  name: 'Update Status Plugin',
  version: '1.0.0',
  author: 'Appu',
  initialize: (client: MahinaBot) => {
    client.on('ready', () => client.utils.updateStatus(client))
  },
}

export default UpdateStatusPlugin

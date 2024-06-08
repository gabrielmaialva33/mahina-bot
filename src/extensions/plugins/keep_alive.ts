import http from 'node:http'

import type { BaseClient } from '#src/common/index'
import type { BotPlugin } from '#src/extensions/index'

const KeepAlive: BotPlugin = {
  name: 'KeepAlive Plugin',
  version: '1.0.0',
  author: 'mrootx',
  initialize: (client: BaseClient) => {
    if (client.keepAlive) {
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(`I'm alive! Currently serving ${client.guilds.cache.size} guilds.`)
      })

      server.listen(3333, () => {
        client.logger.info('Keep-Alive server is running on port 3333')
      })
    }
  },
}

export default KeepAlive

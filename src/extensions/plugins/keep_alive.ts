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

      // generate a random port to avoid conflicts
      const randomPort = Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152

      server.listen(randomPort, () => {
        client.logger.info(`KeepAlive server is running on port ${randomPort}`)
      })
    }
  },
}

export default KeepAlive

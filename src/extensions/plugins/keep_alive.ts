import http from 'node:http'

import { env } from '#src/env'
import type MahinaBot from '#common/mahina_bot'
import { type BotPlugin } from '#src/extensions/index'

const KeepAlive: BotPlugin = {
  name: 'KeepAlive Plugin',
  version: '1.0.0',
  author: 'mrootx',
  initialize: (client: MahinaBot) => {
    if (env.KEEP_ALIVE) {
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end(`I'm alive! Currently serving ${client.guilds.cache.size} guilds.`)
      })
      server.listen(3000, () => {
        client.logger.info('Keep-Alive server is running on port 3000')
      })
    }
  },
}

export default KeepAlive

import { ShardingManager } from 'discord.js'

import { env } from '#src/env'
import { startObjection } from '#src/lib/objection'
import { Logger } from '#src/lib/logger'

import { HistoryUtils } from '#utils/history.utils'
import { server } from '#src/server'

const manager = new ShardingManager('./build/bot_client.js', {
  respawn: true,
  token: env.DISC_BOT_TOKEN,
  totalShards: 'auto',
  shardList: 'auto',
})

manager
  .spawn({ amount: manager.totalShards, timeout: -1 })
  .catch((err: any) => new Logger().error(err))

manager.on('shardCreate', (shard) => {
  shard.on('ready', () => {
    startObjection().then(() => {})
    HistoryUtils.reset_history()

    new Logger().info(`Shard ${shard.id} is ready`)
  })
})

server.listen(env.PORT, () => {
  new Logger().info(`Server started on port ${env.PORT}`)
})

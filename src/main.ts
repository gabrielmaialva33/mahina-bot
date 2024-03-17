import { ShardingManager } from 'discord.js'

import { env } from '#src/env'

const manager = new ShardingManager('./build/bot.js', {
  respawn: true,
  token: env.DISC_BOT_TOKEN,
  totalShards: 'auto',
  shardList: 'auto',
})

manager.spawn({ amount: manager.totalShards, timeout: -1 }).catch((err: any) => {
  console.error(err)
})

manager.on('shardCreate', (shard) => {
  shard.on('ready', () => {
    console.log(`Shard ${shard.id} is ready`)
  })
})

import type MahinaBot from '#common/mahina_bot'
import { type BotPlugin } from '#src/extensions/index'

const AntiCrash: BotPlugin = {
  name: 'AntiCrash Plugin',
  version: '1.0.0',
  author: 'mrootx',
  initialize: (client: MahinaBot) => {
    const handleExit = async (): Promise<void> => {
      if (client) {
        client.logger.star('Disconnecting from Discord...')
        await client.destroy()
        client.logger.success('Successfully disconnected from Discord!')
        process.exit()
      }
    }
    process.on('unhandledRejection', (reason, promise) => {
      client.logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
    })
    process.on('uncaughtException', (err) => {
      client.logger.error('Uncaught Exception thrown:', err)
    })
    process.on('SIGINT', handleExit)
    process.on('SIGTERM', handleExit)
    process.on('SIGQUIT', handleExit)
  },
}

export default AntiCrash

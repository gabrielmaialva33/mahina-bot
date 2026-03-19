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

      // Handle specific Lavalink errors
      if (reason && typeof reason === 'object' && 'code' in reason) {
        if (reason.code === 'ERR_UNHANDLED_ERROR') {
          client.logger.warn('Lavalink node error detected, attempting to handle gracefully...')
          return // Don't crash on Lavalink errors
        }
      }
    })

    process.on('uncaughtException', (err) => {
      client.logger.error('Uncaught Exception thrown:', err)

      // Handle specific Lavalink errors
      if ((err as any).code === 'ERR_UNHANDLED_ERROR' && err.message.includes('LavalinkNode')) {
        client.logger.warn('Lavalink node exception detected, attempting to handle gracefully...')
        return
      }

      // Don't crash on Discord API errors (rate limits, invalid form body, etc)
      if (err.name === 'DiscordAPIError' || err.name === 'HTTPError') {
        client.logger.warn(`Discord API error handled gracefully: ${err.message}`)
        return
      }

      // Exit on truly fatal exceptions — process may be in corrupt state
      client.logger.error('Fatal uncaught exception, shutting down...')
      process.exit(1)
    })
    process.on('SIGINT', handleExit)
    process.on('SIGTERM', handleExit)
    process.on('SIGQUIT', handleExit)
  },
}

export default AntiCrash

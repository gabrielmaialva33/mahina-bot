import {
  LavalinkManager,
  type LavalinkNodeOptions,
  type SearchPlatform,
  type SearchResult,
} from 'lavalink-client'

import type MahinaBot from '#common/mahina_bot'
import { autoPlayFunction, requesterTransformer } from '#utils/functions/player'

export default class MahinaLinkClient extends LavalinkManager {
  client: MahinaBot

  constructor(client: MahinaBot) {
    super({
      nodes: client.env.NODES as LavalinkNodeOptions[],
      sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
      queueOptions: {
        maxPreviousTracks: 25,
      },
      playerOptions: {
        defaultSearchPlatform: client.env.SEARCH_ENGINE,
        onDisconnect: {
          autoReconnect: true,
          destroyPlayer: false,
        },
        requesterTransformer: requesterTransformer,
        onEmptyQueue: {
          autoPlayFunction,
        },
      },
    })
    this.client = client

    // Setup error handlers for Lavalink nodes
    this.setupErrorHandlers()
  }

  private setupErrorHandlers(): void {
    // Handle node manager errors
    this.nodeManager.on('error', (node, error) => {
      this.client.logger.error(`Lavalink Node Error (${node.id}):`, error)
    })

    // Handle individual node errors after initialization
    this.on('nodeCreate', (node) => {
      node.on('error', (error) => {
        this.client.logger.error(`Lavalink Node ${node.id} Error:`, error)
      })

      node.on('disconnect', (code, reason) => {
        this.client.logger.warn(`Lavalink Node ${node.id} disconnected: ${code} - ${reason}`)
      })

      node.on('reconnecting', () => {
        this.client.logger.info(`Lavalink Node ${node.id} is reconnecting...`)
      })

      node.on('connect', () => {
        this.client.logger.success(`Lavalink Node ${node.id} connected successfully`)
      })
    })

    // Global Lavalink error handler
    this.on('error', (error, node) => {
      this.client.logger.error(`Lavalink Manager Error${node ? ` (Node: ${node.id})` : ''}:`, error)
    })
  }

  /**
   * Searches for a song and returns the tracks.
   * @param query The query to search for.
   * @param user The user who requested the search.
   * @param source The source to search in. Defaults to youtube.
   * @returns An array of tracks that match the query.
   */
  async search(query: string, user: unknown, source?: SearchPlatform): Promise<SearchResult> {
    const nodes = this.nodeManager.leastUsedNodes()
    const node = nodes[Math.floor(Math.random() * nodes.length)]
    const result = await node.search({ query, source }, user, false)
    return result
  }
}

import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

export class LavalinkHealthService {
  private client: MahinaBot
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 60 * 1000 // Check every minute
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private reconnectAttempts: Map<string, number> = new Map()

  constructor(client: MahinaBot) {
    this.client = client
  }

  start(): void {
    logger.info('Starting Lavalink Health Service')

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.CHECK_INTERVAL)

    // Initial health check after 30 seconds
    setTimeout(() => {
      this.performHealthCheck()
    }, 30 * 1000)
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    logger.info('Lavalink Health Service stopped')
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.client.manager) return

    const nodes = this.client.manager.nodeManager.nodes

    for (const [nodeId, node] of nodes.entries()) {
      try {
        // Check if node is alive and connected
        if (!node.isAlive || !node.connected) {
          logger.warn(`Lavalink node ${nodeId} is not healthy, attempting reconnection...`)
          await this.handleUnhealthyNode(nodeId, node)
        } else {
          // Reset reconnect attempts for healthy nodes
          this.reconnectAttempts.delete(nodeId)
        }
      } catch (error) {
        logger.error(`Error checking health of Lavalink node ${nodeId}:`, error)
      }
    }
  }

  private async handleUnhealthyNode(nodeId: string, node: any): Promise<void> {
    const attempts = this.reconnectAttempts.get(nodeId) || 0

    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        `Lavalink node ${nodeId} has reached maximum reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS})`
      )
      return
    }

    this.reconnectAttempts.set(nodeId, attempts + 1)

    try {
      // Try to reconnect the node
      if (!node.connected) {
        // Wait a bit before reconnecting
        await new Promise((resolve) => setTimeout(resolve, 2000))

        await node.connect()
        logger.success(`Successfully reconnected Lavalink node ${nodeId}`)

        // Reset attempts on successful reconnection
        this.reconnectAttempts.delete(nodeId)
      }
    } catch (error) {
      logger.error(
        `Failed to reconnect Lavalink node ${nodeId} (attempt ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS}):`,
        error
      )
    }
  }

  // Get health statistics
  getHealthStats(): {
    totalNodes: number
    healthyNodes: number
    unhealthyNodes: number
    reconnectingNodes: number
  } {
    if (!this.client.manager) {
      return { totalNodes: 0, healthyNodes: 0, unhealthyNodes: 0, reconnectingNodes: 0 }
    }

    const nodes = this.client.manager.nodeManager.nodes
    let healthy = 0
    let unhealthy = 0
    let reconnecting = 0

    for (const node of nodes.values()) {
      if (node.isAlive && node.connected) {
        healthy++
      } else if (this.reconnectAttempts.has(node.id)) {
        reconnecting++
      } else {
        unhealthy++
      }
    }

    return {
      totalNodes: nodes.size,
      healthyNodes: healthy,
      unhealthyNodes: unhealthy,
      reconnectingNodes: reconnecting,
    }
  }

  // Force reconnect all nodes
  async forceReconnectAll(): Promise<void> {
    if (!this.client.manager) return

    const nodes = this.client.manager.nodeManager.nodes
    logger.info(`Force reconnecting ${nodes.size} Lavalink nodes...`)

    for (const [nodeId, node] of nodes.entries()) {
      try {
        if (node.connected) {
          await node.disconnect()
        }

        await node.connect()
        logger.success(`Force reconnected Lavalink node ${nodeId}`)
      } catch (error) {
        logger.error(`Failed to force reconnect Lavalink node ${nodeId}:`, error)
      }
    }
  }

  // Check if any healthy nodes are available
  hasHealthyNodes(): boolean {
    if (!this.client.manager) return false

    const nodes = this.client.manager.nodeManager.nodes

    for (const node of nodes.values()) {
      if (node.isAlive && node.connected) {
        return true
      }
    }

    return false
  }
}

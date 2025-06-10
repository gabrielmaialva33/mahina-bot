import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

export class LavalinkHealthService {
  private client: MahinaBot
  private healthCheckInterval: NodeJS.Timer | null = null
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
        if (!node.isAlive || !node.socket || node.socket.readyState !== 1) {
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
      if (node.socket) {
        // Check WebSocket state:
        // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
        const socketState = node.socket.readyState

        if (socketState === 0) {
          // Socket is still connecting, wait for it to finish
          logger.warn(`Socket for node ${nodeId} is still connecting, waiting...`)
          await new Promise((resolve) => setTimeout(resolve, 5000))
          return
        } else if (socketState === 2 || socketState === 3) {
          // Socket is already closing or closed, just wait a bit
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } else if (socketState === 1) {
          // Socket is open, try to close it properly
          node.socket.removeAllListeners()
          try {
            node.socket.close()
          } catch (closeError) {
            // Ignore close errors as the socket might already be closed
            logger.warn(`Socket close error for node ${nodeId}:`, closeError)
          }
        }
      }

      // Wait a bit before reconnecting
      await new Promise((resolve) => setTimeout(resolve, 2000))

      await node.connect()
      logger.success(`Successfully reconnected Lavalink node ${nodeId}`)

      // Reset attempts on successful reconnection
      this.reconnectAttempts.delete(nodeId)
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
      if (node.isAlive && node.socket && node.socket.readyState === 1) {
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
        if (node.socket) {
          node.socket.removeAllListeners()
          node.socket.close()
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
      if (node.isAlive && node.socket && node.socket.readyState === 1) {
        return true
      }
    }

    return false
  }
}

import { NvidiaAIService } from './nvidia_ai_service'
import { AIContextService } from './ai_context_service'
import { AIMemoryService } from './ai_memory_service'
import { PrismaClient } from '@prisma/client'
import { logger } from '#common/logger'
import { env } from '#src/env'

export class AIManager {
  public nvidia?: NvidiaAIService
  public context?: AIContextService
  public memory?: AIMemoryService

  private prisma: PrismaClient
  private initialized = false

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Initialize all AI services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('AI Manager already initialized')
      return
    }

    try {
      // Initialize NVIDIA AI Service
      if (env.NVIDIA_API_KEY) {
        this.nvidia = new NvidiaAIService(env.NVIDIA_API_KEY)
        logger.info('✅ NVIDIA AI Service initialized')
      } else if (env.OPENAI_API_KEY) {
        // Fallback to OpenAI if available
        logger.warn('NVIDIA_API_KEY not found, OpenAI support not implemented yet')
      } else {
        logger.warn('No AI API keys found. AI features will be disabled.')
      }

      // Initialize Context Service
      this.context = new AIContextService()
      logger.info('✅ AI Context Service initialized')

      // Initialize Memory Service
      this.memory = new AIMemoryService(this.prisma)
      logger.info('✅ AI Memory Service initialized')

      this.initialized = true
      logger.info('🤖 AI Manager fully initialized')

      // Log available features
      this.logAvailableFeatures()
    } catch (error) {
      logger.error('Failed to initialize AI Manager:', error)
      throw error
    }
  }

  /**
   * Check if AI services are available
   */
  isAvailable(): boolean {
    return this.initialized && !!this.nvidia
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean
    services: {
      nvidia: boolean
      context: boolean
      memory: boolean
    }
    features: string[]
  } {
    const features = []

    if (this.nvidia) {
      features.push('Chat', 'Code Analysis', 'Reasoning', 'Streaming')
      const models = this.nvidia.getAllModels()
      features.push(`${models.length} AI Models`)
    }

    if (this.context) {
      features.push('Conversation Context', 'Intent Detection')
    }

    if (this.memory) {
      features.push('User Memory', 'Learning System', 'Personalization')
    }

    return {
      initialized: this.initialized,
      services: {
        nvidia: !!this.nvidia,
        context: !!this.context,
        memory: !!this.memory,
      },
      features,
    }
  }

  /**
   * Log available AI features
   */
  private logAvailableFeatures(): void {
    const status = this.getStatus()

    logger.info('=== AI Features Status ===')
    logger.info(`Initialized: ${status.initialized ? '✅' : '❌'}`)
    logger.info('Services:')
    logger.info(`  - NVIDIA AI: ${status.services.nvidia ? '✅' : '❌'}`)
    logger.info(`  - Context: ${status.services.context ? '✅' : '❌'}`)
    logger.info(`  - Memory: ${status.services.memory ? '✅' : '❌'}`)

    if (status.features.length > 0) {
      logger.info('Available Features:')
      status.features.forEach((feature) => {
        logger.info(`  - ${feature}`)
      })
    }

    if (this.nvidia) {
      logger.info('Available AI Models:')
      const models = this.nvidia.getAllModels()
      models.forEach((model) => {
        logger.info(`  - ${model.name} (${model.category})`)
      })
    }
  }

  /**
   * Shutdown AI services gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down AI Manager...')

    try {
      // Persist any pending memory data
      if (this.memory) {
        this.memory.destroy()
      }

      this.initialized = false
      logger.info('AI Manager shutdown complete')
    } catch (error) {
      logger.error('Error during AI Manager shutdown:', error)
    }
  }

  /**
   * Get AI statistics
   */
  async getStatistics(): Promise<{
    contextStats: any
    modelUsage: Record<string, number>
    totalInteractions: number
  }> {
    const contextStats = this.context?.getStats() || {
      totalContexts: 0,
      totalMessages: 0,
      contextsByChannel: {},
    }

    // TODO: Implement model usage tracking
    const modelUsage = {}

    // Count total AI interactions from database
    let totalInteractions = 0
    try {
      const memories = await this.prisma.aiMemory.count()
      totalInteractions = memories
    } catch (error) {
      logger.error('Failed to get AI statistics:', error)
    }

    return {
      contextStats,
      modelUsage,
      totalInteractions,
    }
  }

  /**
   * Clear all AI data for a user
   */
  async clearUserData(userId: string, guildId?: string): Promise<void> {
    logger.info(`Clearing AI data for user ${userId}${guildId ? ` in guild ${guildId}` : ''}`)

    try {
      // Clear context
      if (this.context) {
        // Context service would need a method to clear by userId
        // For now, this is a placeholder
        logger.info('Context clearing not implemented yet')
      }

      // Clear memory from database
      if (guildId) {
        await this.prisma.aiMemory.deleteMany({
          where: { userId, guildId },
        })
      } else {
        await this.prisma.aiMemory.deleteMany({
          where: { userId },
        })
      }

      logger.info(`AI data cleared for user ${userId}`)
    } catch (error) {
      logger.error('Failed to clear user AI data:', error)
      throw error
    }
  }

  /**
   * Export user AI data (for GDPR compliance)
   */
  async exportUserData(userId: string): Promise<{
    memories: any[]
    contexts: any[]
  }> {
    logger.info(`Exporting AI data for user ${userId}`)

    try {
      // Export memories
      const memories = await this.prisma.aiMemory.findMany({
        where: { userId },
      })

      // Export contexts (would need implementation in context service)
      const contexts = []

      return {
        memories: memories.map((m) => ({
          guildId: m.guildId,
          data: JSON.parse(m.data as string),
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        contexts,
      }
    } catch (error) {
      logger.error('Failed to export user AI data:', error)
      throw error
    }
  }
}

// Singleton instance
let aiManager: AIManager | null = null

export function getAIManager(prisma: PrismaClient): AIManager {
  if (!aiManager) {
    aiManager = new AIManager(prisma)
  }
  return aiManager
}

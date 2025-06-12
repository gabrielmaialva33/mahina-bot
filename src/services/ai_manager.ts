import { NvidiaAIService } from './nvidia_ai_service.js'
import { NvidiaEnhancedService } from './nvidia_enhanced_service.js'
import { AIContextService } from './ai_context_service.js'
import { AIMemoryService } from './ai_memory_service.js'
import { AIJobService } from './ai_job_service.js'
import { PrismaClient } from '@prisma/client'
import { logger } from '#common/logger'
import { env } from '#src/env'
import type MahinaBot from '#common/mahina_bot'

export class AIManager {
  public nvidia?: NvidiaAIService
  public nvidiaEnhanced?: NvidiaEnhancedService
  public context?: AIContextService
  public memory?: AIMemoryService
  public jobs?: AIJobService

  private prisma: PrismaClient
  private bot: MahinaBot
  private initialized = false

  constructor(bot: MahinaBot, prisma: PrismaClient) {
    this.bot = bot
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
      // Initialize NVIDIA Enhanced Service
      if (env.NVIDIA_API_KEY) {
        this.nvidiaEnhanced = new NvidiaEnhancedService(this.bot, env.NVIDIA_API_KEY)
        await this.nvidiaEnhanced.initialize()
        logger.info('✅ NVIDIA Enhanced AI Service initialized')

        // Also initialize legacy service for compatibility
        this.nvidia = new NvidiaAIService(env.NVIDIA_API_KEY)
        logger.info('✅ NVIDIA AI Service (legacy) initialized')
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

      // Initialize Job Service if pg-boss is enabled
      if (env.PGBOSS_ENABLED) {
        this.jobs = new AIJobService(this.bot)
        await this.jobs.initialize()
        logger.info('✅ AI Job Service initialized with pg-boss')
      }

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
    return this.initialized && (!!this.nvidiaEnhanced || !!this.nvidia)
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean
    services: {
      nvidia: boolean
      nvidiaEnhanced: boolean
      context: boolean
      memory: boolean
      jobs: boolean
    }
    features: string[]
  } {
    const features = []

    if (this.nvidiaEnhanced) {
      features.push('Enhanced Chat', 'Vision Analysis', 'Multimodal AI', 'RAG')
      const models = this.nvidiaEnhanced.getAllModels()
      features.push(`${models.length} Enhanced AI Models`)
    } else if (this.nvidia) {
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

    if (this.jobs) {
      features.push('Async Processing', 'Job Queue', 'Batch Operations')
    }

    return {
      initialized: this.initialized,
      services: {
        nvidia: !!this.nvidia,
        nvidiaEnhanced: !!this.nvidiaEnhanced,
        context: !!this.context,
        memory: !!this.memory,
        jobs: !!this.jobs,
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
    logger.info(`  - NVIDIA Enhanced: ${status.services.nvidiaEnhanced ? '✅' : '❌'}`)
    logger.info(`  - Context: ${status.services.context ? '✅' : '❌'}`)
    logger.info(`  - Memory: ${status.services.memory ? '✅' : '❌'}`)
    logger.info(`  - Jobs: ${status.services.jobs ? '✅' : '❌'}`)

    if (status.features.length > 0) {
      logger.info('Available Features:')
      status.features.forEach((feature) => {
        logger.info(`  - ${feature}`)
      })
    }

    if (this.nvidiaEnhanced) {
      logger.info('Available Enhanced AI Models:')
      const models = this.nvidiaEnhanced.getAllModels()
      models.slice(0, 5).forEach((model) => {
        logger.info(`  - ${model.name} (${model.category}) - ${model.contextLength} tokens`)
      })
      if (models.length > 5) {
        logger.info(`  ... and ${models.length - 5} more models`)
      }
    } else if (this.nvidia) {
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
      // Shutdown job service
      if (this.jobs) {
        await this.jobs.shutdown()
      }

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
      const memories = await this.prisma.aIMemory.count()
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
        await this.prisma.aIMemory.deleteMany({
          where: { userId, guildId },
        })
      } else {
        await this.prisma.aIMemory.deleteMany({
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
      const memories = await this.prisma.aIMemory.findMany({
        where: { userId },
      })

      // Export contexts (would need implementation in context service)
      const contexts: any[] = []

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

export function getAIManager(bot: MahinaBot, prisma: PrismaClient): AIManager {
  if (!aiManager) {
    aiManager = new AIManager(bot, prisma)
  }
  return aiManager
}

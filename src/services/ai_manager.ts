import { PrismaClient } from '@prisma/client'
import { logger } from '#common/logger'
import { env } from '#src/env'
import type MahinaBot from '#common/mahina_bot'
import { AIContextService } from './ai_context_service.js'
import { AIMemoryService } from './ai_memory_service.js'
import { AIQueueService } from './ai_queue_service.js'
import { NvidiaAIService } from './nvidia_ai_service.js'
import { NvidiaMultimodalService } from './nvidia_multimodal_service.js'

export class AIManager {
  public nvidia?: NvidiaAIService
  public nvidiaMultimodal?: NvidiaMultimodalService
  public context?: AIContextService
  public memory?: AIMemoryService
  public queue?: AIQueueService

  private prisma: PrismaClient
  private bot: MahinaBot
  private initialized = false

  constructor(bot: MahinaBot, prisma: PrismaClient) {
    this.bot = bot
    this.prisma = prisma
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('AI Manager already initialized')
      return
    }

    try {
      if (env.NVIDIA_API_KEY) {
        this.nvidiaMultimodal = new NvidiaMultimodalService(this.bot, env.NVIDIA_API_KEY)
        await this.nvidiaMultimodal.initialize()
        logger.info('✅ NVIDIA multimodal AI service initialized')

        this.nvidia = new NvidiaAIService(env.NVIDIA_API_KEY)
        logger.info('✅ NVIDIA AI Service (legacy) initialized')
      } else if (env.OPENAI_API_KEY) {
        logger.warn('NVIDIA_API_KEY not found, OpenAI support not implemented yet')
      } else {
        logger.warn('No AI API keys found. AI features will be disabled.')
      }

      this.context = new AIContextService()
      logger.info('✅ AI Context Service initialized')

      this.memory = new AIMemoryService(this.prisma)
      logger.info('✅ AI Memory Service initialized')

      if (env.AI_QUEUE_ENABLED) {
        this.queue = new AIQueueService(this.bot)
        await this.queue.initialize()
        logger.info('✅ AI queue service initialized with Redis')
      }

      this.initialized = true
      logger.info('🤖 AI Manager fully initialized')
      this.logAvailableFeatures()
    } catch (error) {
      logger.error('Failed to initialize AI Manager:', error)
      throw error
    }
  }

  isAvailable(): boolean {
    return this.initialized && (!!this.nvidiaMultimodal || !!this.nvidia)
  }

  getStatus(): {
    initialized: boolean
    services: {
      nvidia: boolean
      nvidiaMultimodal: boolean
      context: boolean
      memory: boolean
      queue: boolean
    }
    features: string[]
  } {
    const features = []

    if (this.nvidiaMultimodal) {
      features.push('Multimodal Chat', 'Vision Analysis', 'RAG')
      features.push(`${this.nvidiaMultimodal.getAllModels().length} Multimodal AI Models`)
    } else if (this.nvidia) {
      features.push('Chat', 'Code Analysis', 'Reasoning', 'Streaming')
      features.push(`${this.nvidia.getAllModels().length} AI Models`)
    }

    if (this.context) {
      features.push('Conversation Context', 'Intent Detection')
    }

    if (this.memory) {
      features.push('User Memory', 'Learning System', 'Personalization')
    }

    if (this.queue) {
      features.push('Redis Queue', 'Async Processing', 'Batch Operations')
    }

    return {
      initialized: this.initialized,
      services: {
        nvidia: !!this.nvidia,
        nvidiaMultimodal: !!this.nvidiaMultimodal,
        context: !!this.context,
        memory: !!this.memory,
        queue: !!this.queue,
      },
      features,
    }
  }

  private logAvailableFeatures(): void {
    const status = this.getStatus()

    logger.info('=== AI Features Status ===')
    logger.info(`Initialized: ${status.initialized ? '✅' : '❌'}`)
    logger.info('Services:')
    logger.info(`  - NVIDIA AI: ${status.services.nvidia ? '✅' : '❌'}`)
    logger.info(`  - NVIDIA Multimodal: ${status.services.nvidiaMultimodal ? '✅' : '❌'}`)
    logger.info(`  - Context: ${status.services.context ? '✅' : '❌'}`)
    logger.info(`  - Memory: ${status.services.memory ? '✅' : '❌'}`)
    logger.info(`  - Queue: ${status.services.queue ? '✅' : '❌'}`)

    for (const feature of status.features) {
      logger.info(`  - ${feature}`)
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AI Manager...')

    try {
      if (this.queue) {
        await this.queue.shutdown()
      }

      if (this.memory) {
        this.memory.destroy()
      }

      this.initialized = false
      logger.info('AI Manager shutdown complete')
    } catch (error) {
      logger.error('Error during AI Manager shutdown:', error)
    }
  }

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

    let totalInteractions = 0
    try {
      totalInteractions = await this.prisma.aIMemory.count()
    } catch (error) {
      logger.error('Failed to get AI statistics:', error)
    }

    return {
      contextStats,
      modelUsage: {},
      totalInteractions,
    }
  }

  async clearUserData(userId: string, guildId?: string): Promise<void> {
    logger.info(`Clearing AI data for user ${userId}${guildId ? ` in guild ${guildId}` : ''}`)

    try {
      if (guildId) {
        await this.prisma.aIMemory.deleteMany({
          where: {
            userId,
            guildId,
          },
        })

        await this.prisma.chatHistory.deleteMany({
          where: {
            userId,
            guildId,
          },
        })
      } else {
        await this.prisma.aIMemory.deleteMany({ where: { userId } })
        await this.prisma.chatHistory.deleteMany({ where: { userId } })
      }
    } catch (error) {
      logger.error('Failed to clear user AI data:', error)
      throw error
    }
  }
}

let aiManagerInstance: AIManager | null = null

export function getAIManager(bot: MahinaBot, prisma: PrismaClient): AIManager {
  if (!aiManagerInstance) {
    aiManagerInstance = new AIManager(bot, prisma)
  }

  return aiManagerInstance
}

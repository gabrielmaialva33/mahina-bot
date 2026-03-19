import { PrismaClient } from '@prisma/client'
import { logger } from '#common/logger'
import { env } from '#src/env'
import type MahinaBot from '#common/mahina_bot'
import { AIContextService } from './ai_context_service.js'
import { AIMemoryService } from './ai_memory_service.js'
import { AIQueueService } from './ai_queue_service.js'
import { NvidiaAIService } from './nvidia_ai_service.js'
import { NvidiaMultimodalService } from './nvidia_multimodal_service.js'
import { MahinaBrain } from './mahina_brain.js'

export class AIManager {
  public nvidia?: NvidiaAIService
  public nvidiaMultimodal?: NvidiaMultimodalService
  public context?: AIContextService
  public memory?: AIMemoryService
  public queue?: AIQueueService
  public brain?: MahinaBrain

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
      await this.initializeCoreProviders()
      this.initializeContext()
      this.initializeMemory()
      this.initializeBrain()
      await this.initializeQueue()

      this.initialized = true
      this.logInitializationSummary()
    } catch (error) {
      logger.error('Failed to initialize AI Manager:', error)
      throw error
    }
  }

  private async initializeCoreProviders(): Promise<void> {
    if (env.NVIDIA_API_KEY) {
      this.nvidiaMultimodal = new NvidiaMultimodalService(this.bot, env.NVIDIA_API_KEY)
      await this.nvidiaMultimodal.initialize()
      this.nvidia = new NvidiaAIService(env.NVIDIA_API_KEY)
      return
    }

    if (env.OPENAI_API_KEY) {
      logger.warn('AI bootstrap: OPENAI_API_KEY found, but OpenAI provider is not implemented yet')
      return
    }

    logger.warn('AI bootstrap: no provider API key configured')
  }

  private initializeContext(): void {
    this.context = new AIContextService()
  }

  private initializeMemory(): void {
    this.memory = new AIMemoryService(this.prisma)
  }

  private initializeBrain(): void {
    this.brain = new MahinaBrain(this.bot)
  }

  private async initializeQueue(): Promise<void> {
    if (!env.AI_QUEUE_ENABLED) return

    this.queue = new AIQueueService(this.bot)
    await this.queue.initialize()
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
      brain: boolean
    }
    features: string[]
  } {
    const features = []

    if (this.brain) {
      features.push('MahinaBrain (Multi-Provider AI)')
    }

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
        brain: !!this.brain,
      },
      features,
    }
  }

  private logInitializationSummary(): void {
    const status = this.getStatus()
    const enabledProviders = []

    if (status.services.nvidiaMultimodal) enabledProviders.push('nvidia-multimodal')
    if (status.services.nvidia) enabledProviders.push('nvidia-legacy')

    const enabledInfrastructure = []

    if (status.services.context) enabledInfrastructure.push('context')
    if (status.services.memory) enabledInfrastructure.push('memory')
    if (status.services.brain) enabledInfrastructure.push('brain')
    if (status.services.queue) enabledInfrastructure.push('queue')

    logger.info(
      `AI ready: providers=${enabledProviders.join(', ') || 'none'} | services=${enabledInfrastructure.join(', ') || 'none'}`
    )

    if (status.features.length > 0) {
      logger.debug(`AI features: ${status.features.join(' | ')}`)
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

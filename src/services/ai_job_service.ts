import PgBoss from 'pg-boss'
import { EventEmitter } from 'node:events'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'

export interface AIJobData {
  type: 'embedding' | 'analysis' | 'generation' | 'training' | 'batch_processing'
  userId: string
  guildId: string
  data: any
  priority?: number
  retryLimit?: number
}

export interface EmbeddingJobData extends AIJobData {
  type: 'embedding'
  data: {
    content: string
    contentType: 'message' | 'command' | 'document'
    metadata?: any
  }
}

export interface AnalysisJobData extends AIJobData {
  type: 'analysis'
  data: {
    messages: string[]
    analysisType: 'sentiment' | 'topic' | 'behavior' | 'comprehensive'
  }
}

export interface GenerationJobData extends AIJobData {
  type: 'generation'
  data: {
    prompt: string
    model: string
    parameters?: {
      temperature?: number
      maxTokens?: number
      topP?: number
    }
  }
}

export interface TrainingJobData extends AIJobData {
  type: 'training'
  data: {
    dataset: any[]
    modelType: 'rl' | 'embedding' | 'classifier'
    parameters?: any
  }
}

export class AIJobService extends EventEmitter {
  private boss: PgBoss | null = null
  private client: MahinaBot
  private isInitialized = false
  private jobHandlers: Map<string, (job: any) => Promise<any>> = new Map()

  constructor(client: MahinaBot) {
    super()
    this.client = client
  }

  async initialize(): Promise<void> {
    try {
      // Configure pg-boss with TimescaleDB connection
      this.boss = new PgBoss({
        connectionString: env.DATABASE_URL,
        schema: 'pgboss',
        retryLimit: 3,
        retryDelay: 60,
        retryBackoff: true,
        expireInHours: 24,
        archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days
        deleteAfterDays: 30,
        monitorStateIntervalSeconds: 30,
        maintenanceIntervalSeconds: 60,
      })

      // Start pg-boss
      await this.boss.start()
      this.isInitialized = true

      // Register job handlers
      this.registerHandlers()

      logger.info('AI Job Service initialized with pg-boss and TimescaleDB')
    } catch (error) {
      logger.error('Failed to initialize AI Job Service:', error)
      throw error
    }
  }

  private registerHandlers(): void {
    if (!this.boss) return

    // Embedding job handler
    this.registerHandler('ai:embedding', async (job) => {
      const { data } = job.data as EmbeddingJobData
      const embeddingService = this.client.services.nvidiaEmbedding

      if (!embeddingService?.isAvailable()) {
        throw new Error('Embedding service not available')
      }

      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(data.content)

      // Store in TimescaleDB
      const prisma = await this.client.db.getPrismaClient()
      await prisma.$executeRaw`
        INSERT INTO embedding_cache (content_hash, content, embedding, model_version, metadata)
        VALUES (
          encode(digest(${data.content}, 'sha256'), 'hex'),
          ${data.content},
          ${embedding}::vector,
          'nvidia-embed-qa-4',
          ${JSON.stringify(data.metadata || {})}::jsonb
        )
        ON CONFLICT (content_hash) 
        DO UPDATE SET accessed_at = NOW()
      `

      return { embedding, cached: false }
    })

    // Analysis job handler
    this.registerHandler('ai:analysis', async (job) => {
      const { data, userId, guildId } = job.data as AnalysisJobData
      const contextService = this.client.services.aiContext

      if (!contextService) {
        throw new Error('Context service not available')
      }

      const results = []
      for (const message of data.messages) {
        const analysis = await contextService.analyzeMessage(message)
        results.push(analysis)
      }

      // Store analysis results in TimescaleDB
      const prisma = await this.client.db.getPrismaClient()
      await prisma.$executeRaw`
        INSERT INTO ai_interactions (
          user_id, guild_id, channel_id, interaction_type, 
          message, response, model_used, metadata
        ) VALUES (
          ${userId},
          ${guildId},
          'batch_analysis',
          'analysis',
          ${data.messages.join('\n')},
          ${JSON.stringify(results)},
          'context-analyzer',
          ${JSON.stringify({ analysisType: data.analysisType })}::jsonb
        )
      `

      return results
    })

    // Generation job handler
    this.registerHandler('ai:generation', async (job) => {
      const { data, userId } = job.data as GenerationJobData
      const nvidiaService = this.client.services.nvidia

      if (!nvidiaService) {
        throw new Error('NVIDIA service not available')
      }

      // Set model for user
      if (data.model) {
        nvidiaService.setUserModel(userId, data.model)
      }

      // Generate response
      const response = await nvidiaService.chat(userId, data.prompt)

      // Store in TimescaleDB for metrics
      const prisma = await this.client.db.getPrismaClient()
      await prisma.$executeRaw`
        INSERT INTO ai_interactions (
          user_id, guild_id, channel_id, interaction_type,
          message, response, model_used, tokens_used
        ) VALUES (
          ${userId},
          'batch',
          'generation',
          'generation',
          ${data.prompt},
          ${response},
          ${data.model || 'default'},
          ${response.length / 4} -- Approximate token count
        )
      `

      return response
    })

    // Training job handler (for RL models)
    this.registerHandler('ai:training', async (job) => {
      const { data } = job.data as TrainingJobData

      // This is a placeholder for training logic
      // In production, this would trigger actual model training
      logger.info(`Training job started: ${data.modelType}`)

      // Simulate training process
      await new Promise((resolve) => setTimeout(resolve, 5000))

      return {
        status: 'completed',
        modelType: data.modelType,
        metrics: {
          accuracy: 0.95,
          loss: 0.05,
          iterations: 1000,
        },
      }
    })

    // Batch processing handler
    this.registerHandler('ai:batch', async (job) => {
      const { data } = job.data
      const results = []

      for (const item of data.items) {
        // Process each item based on its type
        const result = await this.processItem(item)
        results.push(result)
      }

      return results
    })
  }

  private registerHandler(queueName: string, handler: (job: any) => Promise<any>): void {
    if (!this.boss) return

    this.jobHandlers.set(queueName, handler)

    this.boss.work(queueName, async (job) => {
      try {
        const startTime = Date.now()
        const result = await handler(job)
        const duration = Date.now() - startTime

        // Store metrics
        await this.storeMetrics(queueName, duration, true)

        return result
      } catch (error) {
        logger.error(`Job ${queueName} failed:`, error)

        // Store error metrics
        await this.storeMetrics(queueName, 0, false, error)

        throw error
      }
    })
  }

  private async storeMetrics(
    jobType: string,
    duration: number,
    success: boolean,
    error?: any
  ): Promise<void> {
    try {
      const prisma = await this.client.db.getPrismaClient()
      await prisma.$executeRaw`
        INSERT INTO ai_model_metrics (
          model_name, request_count, avg_response_time_ms,
          error_count, success_rate, metadata
        ) VALUES (
          ${jobType},
          1,
          ${duration},
          ${success ? 0 : 1},
          ${success ? 1.0 : 0.0},
          ${JSON.stringify({ error: error?.message })}::jsonb
        )
      `
    } catch (err) {
      logger.error('Failed to store metrics:', err)
    }
  }

  async queueJob(jobData: AIJobData): Promise<string> {
    if (!this.boss || !this.isInitialized) {
      throw new Error('AI Job Service not initialized')
    }

    const queueName = `ai:${jobData.type}`
    const options: PgBoss.SendOptions = {
      priority: jobData.priority || 0,
      retryLimit: jobData.retryLimit || 3,
      retryDelay: 60,
      retryBackoff: true,
    }

    const jobId = await this.boss.send(queueName, jobData, options)

    this.emit('job:queued', { jobId, type: jobData.type, userId: jobData.userId })

    return jobId
  }

  async queueBatchJobs(jobs: AIJobData[]): Promise<string[]> {
    if (!this.boss || !this.isInitialized) {
      throw new Error('AI Job Service not initialized')
    }

    const jobIds = []

    for (const job of jobs) {
      const jobId = await this.queueJob(job)
      jobIds.push(jobId)
    }

    return jobIds
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.boss) {
      throw new Error('AI Job Service not initialized')
    }

    return await this.boss.getJobById(jobId)
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!this.boss) {
      throw new Error('AI Job Service not initialized')
    }

    await this.boss.cancel(jobId)
  }

  async getQueueStats(): Promise<any> {
    if (!this.boss) {
      throw new Error('AI Job Service not initialized')
    }

    const queues = ['ai:embedding', 'ai:analysis', 'ai:generation', 'ai:training', 'ai:batch']
    const stats: any = {}

    for (const queue of queues) {
      const queueSize = await this.boss.getQueueSize(queue)
      const completed = await this.boss.getJobById(queue, 'completed')
      const failed = await this.boss.getJobById(queue, 'failed')

      stats[queue] = {
        pending: queueSize,
        completed: completed?.length || 0,
        failed: failed?.length || 0,
      }
    }

    return stats
  }

  private async processItem(item: any): Promise<any> {
    // Generic item processor for batch jobs
    switch (item.type) {
      case 'embedding':
        return await this.processEmbedding(item)
      case 'analysis':
        return await this.processAnalysis(item)
      default:
        throw new Error(`Unknown item type: ${item.type}`)
    }
  }

  private async processEmbedding(item: any): Promise<any> {
    const embeddingService = this.client.services.nvidiaEmbedding

    if (!embeddingService?.isAvailable()) {
      throw new Error('Embedding service not available')
    }

    return await embeddingService.generateEmbedding(item.content)
  }

  private async processAnalysis(item: any): Promise<any> {
    const contextService = this.client.services.aiContext

    if (!contextService) {
      throw new Error('Context service not available')
    }

    return await contextService.analyzeMessage(item.message)
  }

  async scheduleRecurringJob(
    name: string,
    cron: string,
    data: any,
    options?: PgBoss.ScheduleOptions
  ): Promise<void> {
    if (!this.boss) {
      throw new Error('AI Job Service not initialized')
    }

    await this.boss.schedule(name, cron, data, options)
  }

  async shutdown(): Promise<void> {
    if (this.boss) {
      await this.boss.stop()
      this.boss = null
      this.isInitialized = false
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.boss !== null
  }
}

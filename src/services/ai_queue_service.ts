import { EventEmitter } from 'node:events'
import { Queue, QueueEvents, Worker, type Job, type JobsOptions } from 'bullmq'
import IORedis from 'ioredis'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'

export interface AIQueueJobData {
  type: 'embedding' | 'analysis' | 'generation' | 'training' | 'batch_processing'
  userId: string
  guildId: string
  data: any
  priority?: number
  retryLimit?: number
}

export interface EmbeddingQueueJobData extends AIQueueJobData {
  type: 'embedding'
  data: {
    content: string
    contentType: 'message' | 'command' | 'document'
    metadata?: any
  }
}

export interface AnalysisQueueJobData extends AIQueueJobData {
  type: 'analysis'
  data: {
    messages: string[]
    analysisType: 'sentiment' | 'topic' | 'behavior' | 'comprehensive'
  }
}

export interface GenerationQueueJobData extends AIQueueJobData {
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

export interface TrainingQueueJobData extends AIQueueJobData {
  type: 'training'
  data: {
    dataset: any[]
    modelType: 'rl' | 'embedding' | 'classifier'
    parameters?: any
  }
}

type QueueName =
  | 'ai-embedding'
  | 'ai-analysis'
  | 'ai-generation'
  | 'ai-training'
  | 'ai-batch'

type QueueStats = Record<
  QueueName,
  {
    pending: number
    active: number
    completed: number
    failed: number
  }
>

const QUEUE_NAMES: QueueName[] = [
  'ai-embedding',
  'ai-analysis',
  'ai-generation',
  'ai-training',
  'ai-batch',
]

const JOB_TYPE_TO_QUEUE: Record<AIQueueJobData['type'], QueueName> = {
  embedding: 'ai-embedding',
  analysis: 'ai-analysis',
  generation: 'ai-generation',
  training: 'ai-training',
  batch_processing: 'ai-batch',
}

export class AIQueueService extends EventEmitter {
  private client: MahinaBot
  private connection?: IORedis
  private queues = new Map<QueueName, Queue>()
  private queueEvents = new Map<QueueName, QueueEvents>()
  private workers = new Map<QueueName, Worker>()
  private isInitialized = false

  constructor(client: MahinaBot) {
    super()
    this.client = client
  }

  async initialize(): Promise<void> {
    try {
      const redisUrl =
        env.REDIS_URL || `redis://:${env.REDIS_PASSWORD}@127.0.0.1:6380`

      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })

      for (const queueName of QUEUE_NAMES) {
        const queue = new Queue(queueName, { connection: this.connection })
        const events = new QueueEvents(queueName, { connection: this.connection.duplicate() })
        const worker = new Worker(
          queueName,
          async (job) => this.processJob(queueName, job),
          {
            connection: this.connection.duplicate(),
            concurrency: 2,
          }
        )

        this.queues.set(queueName, queue)
        this.queueEvents.set(queueName, events)
        this.workers.set(queueName, worker)
      }

      this.isInitialized = true
      logger.info('AI queue service initialized with Redis')
    } catch (error) {
      logger.error('Failed to initialize AI queue service:', error)
      throw error
    }
  }

  async queueJob(jobData: AIQueueJobData): Promise<string> {
    const queueName = JOB_TYPE_TO_QUEUE[jobData.type]
    const queue = this.queues.get(queueName)

    if (!queue) {
      throw new Error(`Queue ${queueName} is not available`)
    }

    const options: JobsOptions = {
      attempts: jobData.retryLimit ?? 3,
      priority: this.normalizePriority(jobData.priority),
      removeOnComplete: 100,
      removeOnFail: 200,
    }

    const job = await queue.add(queueName, jobData, options)
    return job.id || ''
  }

  async getJobStatus(jobId: string): Promise<any> {
    const located = await this.findJob(jobId)

    if (!located) {
      return null
    }

    const { queueName, job } = located
    const state = await job.getState()

    return {
      id: job.id,
      name: queueName,
      priority: job.opts.priority ?? 0,
      created: job.timestamp,
      created_on: job.timestamp,
      started: job.processedOn ?? null,
      started_on: job.processedOn ?? null,
      completed: job.finishedOn ?? null,
      completed_on: job.finishedOn ?? null,
      state,
      data: job.data,
      output: job.returnvalue,
      failedReason: job.failedReason ?? null,
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const located = await this.findJob(jobId)

    if (!located) {
      throw new Error('Job not found')
    }

    const state = await located.job.getState()
    if (state === 'active') {
      throw new Error('Cannot cancel an active job')
    }

    await located.job.remove()
  }

  async getQueueStats(): Promise<QueueStats> {
    const stats = {} as QueueStats

    for (const queueName of QUEUE_NAMES) {
      const queue = this.queues.get(queueName)
      if (!queue) {
        continue
      }

      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
      stats[queueName] = {
        pending: (counts.waiting || 0) + (counts.delayed || 0),
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      }
    }

    return stats
  }

  isAvailable(): boolean {
    return this.isInitialized
  }

  async shutdown(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close()
    }

    for (const events of this.queueEvents.values()) {
      await events.close()
    }

    for (const queue of this.queues.values()) {
      await queue.close()
    }

    await this.connection?.quit()
    this.isInitialized = false
  }

  private async findJob(
    jobId: string
  ): Promise<{ queueName: QueueName; job: Job<AIQueueJobData> } | null> {
    for (const queueName of QUEUE_NAMES) {
      const queue = this.queues.get(queueName)
      const job = queue ? await queue.getJob(jobId) : null
      if (job) {
        return {
          queueName,
          job: job as Job<AIQueueJobData>,
        }
      }
    }

    return null
  }

  private normalizePriority(priority?: number): number {
    const value = Number(priority ?? 0)
    if (Number.isNaN(value)) {
      return 1
    }

    return Math.min(10, Math.max(1, value || 1))
  }

  private async processJob(queueName: QueueName, job: Job<AIQueueJobData>): Promise<unknown> {
    switch (queueName) {
      case 'ai-embedding':
        return this.processEmbeddingJob(job.data as EmbeddingQueueJobData)

      case 'ai-analysis':
        return this.processAnalysisJob(job.data as AnalysisQueueJobData)

      case 'ai-generation':
        return this.processGenerationJob(job.data as GenerationQueueJobData)

      case 'ai-training':
        return this.processTrainingJob(job.data as TrainingQueueJobData)

      case 'ai-batch':
        return this.processBatchJob(job.data)

      default:
        throw new Error(`Unsupported queue ${queueName}`)
    }
  }

  private async processEmbeddingJob(job: EmbeddingQueueJobData): Promise<unknown> {
    const embeddingService = this.client.services.nvidiaEmbedding

    if (!embeddingService?.isAvailable()) {
      throw new Error('Embedding service not available')
    }

    const embedding = await embeddingService.generateEmbedding(job.data.content)

    return {
      type: 'embedding',
      dimensions: embedding.length,
      metadata: job.data.metadata || {},
    }
  }

  private async processAnalysisJob(job: AnalysisQueueJobData): Promise<unknown> {
    const contextService = this.client.services.aiContext

    if (!contextService) {
      throw new Error('Context service not available')
    }

    const results = []
    for (const message of job.data.messages) {
      results.push(await contextService.analyzeMessage(message))
    }

    return {
      type: 'analysis',
      analysisType: job.data.analysisType,
      results,
    }
  }

  private async processGenerationJob(job: GenerationQueueJobData): Promise<unknown> {
    const nvidiaService = this.client.services.nvidiaMultimodal || this.client.services.nvidia

    if (!nvidiaService) {
      throw new Error('AI generation service not available')
    }

    if ('setUserModel' in nvidiaService && job.data.model) {
      nvidiaService.setUserModel(job.userId, job.data.model)
    }

    const response = await nvidiaService.chat(
      job.userId,
      job.data.prompt,
      undefined,
      undefined,
      {
        temperature: job.data.parameters?.temperature,
        maxTokens: job.data.parameters?.maxTokens,
      }
    )

    return {
      type: 'generation',
      model: job.data.model,
      response,
    }
  }

  private async processTrainingJob(job: TrainingQueueJobData): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      type: 'training',
      modelType: job.data.modelType,
      datasetSize: job.data.dataset.length,
      status: 'completed',
    }
  }

  private async processBatchJob(job: AIQueueJobData): Promise<unknown> {
    const items = Array.isArray(job.data?.items) ? job.data.items : []
    const results = []

    for (const item of items) {
      if (item?.type === 'embedding' && item.content) {
        results.push(
          await this.processEmbeddingJob({
            ...job,
            type: 'embedding',
            data: {
              content: String(item.content),
              contentType: 'message',
            },
          })
        )
      } else if (item?.type === 'analysis' && item.message) {
        results.push(
          await this.processAnalysisJob({
            ...job,
            type: 'analysis',
            data: {
              messages: [String(item.message)],
              analysisType: 'comprehensive',
            },
          })
        )
      }
    }

    return {
      type: 'batch_processing',
      processed: results.length,
      results,
    }
  }
}

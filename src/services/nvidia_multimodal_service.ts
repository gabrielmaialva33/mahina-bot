import OpenAI from 'openai'
import { EmbedBuilder } from 'discord.js'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'

export interface NvidiaMultimodalModel {
  id: string
  name: string
  description: string
  category: 'reasoning' | 'coding' | 'general' | 'vision' | 'multimodal'
  contextLength: number
  streaming: boolean
  temperature: number
  topP: number
  maxTokens: number
  features: string[]
  costPerMillion: number
  latency: 'low' | 'medium' | 'high'
}

interface ModelMetricSnapshot {
  model_name: string
  total_requests: number
  total_tokens: number
  avg_response_time: number
  total_errors: number
  success_rate: number
}

interface ModelMetricAccumulator {
  totalRequests: number
  totalTokens: number
  totalResponseTime: number
  totalErrors: number
}

export const NVIDIA_MULTIMODAL_MODELS: Record<string, NvidiaMultimodalModel> = {
  'llama-4-maverick': {
    id: 'meta/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick 17B',
    description: 'General purpose multimodal, multilingual 128 MoE model with 17B parameters',
    category: 'multimodal',
    contextLength: 128000,
    streaming: true,
    temperature: 1.0,
    topP: 1.0,
    maxTokens: 8192,
    features: ['language-generation', 'image-to-text', 'multilingual', 'moe-architecture'],
    costPerMillion: 0.5,
    latency: 'medium',
  },
  'llama-4-scout': {
    id: 'meta/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout 17B',
    description: 'Multimodal, multilingual 16 MoE model with 17B parameters',
    category: 'multimodal',
    contextLength: 128000,
    streaming: true,
    temperature: 1.0,
    topP: 1.0,
    maxTokens: 8192,
    features: ['language-generation', 'image-to-text', 'multilingual'],
    costPerMillion: 0.45,
    latency: 'medium',
  },
  'nemotron-ultra': {
    id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    name: 'Nemotron Ultra 253B',
    description:
      'Superior inference efficiency with highest accuracy for scientific and complex math reasoning',
    category: 'reasoning',
    contextLength: 128000,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    features: ['advanced-reasoning', 'function-calling', 'math', 'coding'],
    costPerMillion: 2.0,
    latency: 'high',
  },
  'nemotron-super': {
    id: 'nvidia/llama-3.3-nemotron-super-49b-v1',
    name: 'Nemotron Super 49B',
    description: 'High efficiency model with leading accuracy for reasoning and tool calling',
    category: 'reasoning',
    contextLength: 128000,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    features: ['advanced-reasoning', 'function-calling', 'chat'],
    costPerMillion: 1.0,
    latency: 'medium',
  },
  'nemotron-nano': {
    id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    name: 'Nemotron Nano 8B',
    description: 'Leading reasoning and agentic AI accuracy model for PC and edge',
    category: 'general',
    contextLength: 128000,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    features: ['advanced-reasoning', 'function-calling', 'edge-computing'],
    costPerMillion: 0.2,
    latency: 'low',
  },
  'deepseek-r1': {
    id: 'deepseek-ai/deepseek-r1',
    name: 'DeepSeek R1',
    description: 'State-of-the-art, high-efficiency LLM excelling in reasoning, math, and coding',
    category: 'reasoning',
    contextLength: 8192,
    streaming: false,
    temperature: 0.6,
    topP: 0.7,
    maxTokens: 4096,
    features: ['math', 'advanced-reasoning', 'coding'],
    costPerMillion: 0.8,
    latency: 'medium',
  },
  'qwen3-235b': {
    id: 'qwen/qwen3-235b-a22b',
    name: 'Qwen3 235B',
    description: 'Advanced reasoning MOE model excelling at reasoning, multilingual tasks',
    category: 'reasoning',
    contextLength: 32768,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 8192,
    features: ['advanced-reasoning', 'complex-math', 'multilingual'],
    costPerMillion: 1.5,
    latency: 'high',
  },
  'mistral-medium-3': {
    id: 'mistralai/mistral-medium-3-instruct',
    name: 'Mistral Medium 3',
    description: 'Powerful, multimodal language model for enterprise applications',
    category: 'multimodal',
    contextLength: 128000,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 8192,
    features: ['language-generation', 'multimodal', 'enterprise'],
    costPerMillion: 1.2,
    latency: 'medium',
  },
  'gemma-3-27b': {
    id: 'google/gemma-3-27b-it',
    name: 'Gemma 3 27B',
    description:
      'Cutting-edge open multimodal model exceling in high-quality reasoning from images',
    category: 'vision',
    contextLength: 8192,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    features: ['language-generation', 'vision-assistant', 'image-reasoning'],
    costPerMillion: 0.6,
    latency: 'medium',
  },
  'phi-4-multimodal': {
    id: 'microsoft/phi-4-multimodal-instruct',
    name: 'Phi 4 Multimodal',
    description: 'Excels in high-quality reasoning from image and audio inputs',
    category: 'multimodal',
    contextLength: 16384,
    streaming: true,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    features: ['chart-understanding', 'audio-processing', 'vision', 'reasoning'],
    costPerMillion: 0.7,
    latency: 'medium',
  },
  'cosmos-predict-7b': {
    id: 'nvidia/cosmos-predict1-7b',
    name: 'Cosmos Predict 7B',
    description: 'Generates physics-aware video world states for physical AI development',
    category: 'vision',
    contextLength: 4096,
    streaming: false,
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 2048,
    features: ['physical-ai', 'image-to-world', 'world-simulation'],
    costPerMillion: 1.0,
    latency: 'high',
  },
  'cosmos-predict-5b': {
    id: 'nvidia/cosmos-predict1-5b',
    name: 'Cosmos Predict 5B',
    description: 'Generates future frames of physics-aware world state',
    category: 'vision',
    contextLength: 4096,
    streaming: false,
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 2048,
    features: ['physical-ai', 'policy-evaluation', 'predictive-modeling'],
    costPerMillion: 0.8,
    latency: 'high',
  },
}

export class NvidiaMultimodalService {
  private client: OpenAI
  private activeModel = 'llama-4-maverick'
  private userModels = new Map<string, string>()
  private modelUsageStats = new Map<string, ModelMetricAccumulator>()
  private bot: MahinaBot

  constructor(bot: MahinaBot, apiKey: string) {
    this.bot = bot
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  }

  async initialize(): Promise<void> {
    logger.info('NVIDIA multimodal service ready')
  }

  setUserModel(userId: string, modelKey: string): boolean {
    if (!NVIDIA_MULTIMODAL_MODELS[modelKey]) {
      return false
    }

    this.userModels.set(userId, modelKey)
    return true
  }

  getUserModel(userId: string): string {
    return this.userModels.get(userId) || this.activeModel
  }

  getModelInfo(modelKey: string): NvidiaMultimodalModel | null {
    return NVIDIA_MULTIMODAL_MODELS[modelKey] || null
  }

  getAllModels(): NvidiaMultimodalModel[] {
    return Object.values(NVIDIA_MULTIMODAL_MODELS)
  }

  getModelsByCategory(category: string): NvidiaMultimodalModel[] {
    return Object.values(NVIDIA_MULTIMODAL_MODELS).filter((model) => model.category === category)
  }

  async chat(
    userId: string,
    message: string,
    context?: string,
    systemPrompt?: string,
    options?: {
      stream?: boolean
      temperature?: number
      maxTokens?: number
      images?: string[]
    }
  ): Promise<string> {
    const modelKey = this.getUserModel(userId)
    const model = NVIDIA_MULTIMODAL_MODELS[modelKey]

    if (!model) {
      throw new Error('Invalid model selected')
    }

    const startTime = Date.now()

    try {
      const messages: Array<Record<string, unknown>> = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      if (context) {
        messages.push({ role: 'system', content: `Context: ${context}` })
      }

      if (options?.images && model.features.includes('image-to-text')) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: message },
            ...options.images.map((url) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ],
        })
      } else {
        messages.push({ role: 'user', content: message })
      }

      const completion = await this.client.chat.completions.create({
        model: model.id,
        messages,
        temperature: options?.temperature || model.temperature,
        top_p: model.topP,
        max_tokens: options?.maxTokens || model.maxTokens,
        stream: false,
      })

      const response = completion.choices[0]?.message?.content || 'No response generated'
      this.recordModelMetric(
        model.id,
        completion.usage?.total_tokens || 0,
        Date.now() - startTime,
        true
      )

      return response
    } catch (error) {
      logger.error('NVIDIA multimodal chat error:', error)
      this.recordModelMetric(model.id, 0, Date.now() - startTime, false)
      throw new Error('Failed to generate AI response')
    }
  }

  async *chatStream(
    userId: string,
    message: string,
    context?: string,
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const modelKey = this.getUserModel(userId)
    const model = NVIDIA_MULTIMODAL_MODELS[modelKey]

    if (!model || !model.streaming) {
      throw new Error('Model does not support streaming')
    }

    const startTime = Date.now()
    let fullResponse = ''

    try {
      const messages: Array<Record<string, unknown>> = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      if (context) {
        messages.push({ role: 'system', content: `Context: ${context}` })
      }

      messages.push({ role: 'user', content: message })

      const stream = await this.client.chat.completions.create({
        model: model.id,
        messages,
        temperature: model.temperature,
        top_p: model.topP,
        max_tokens: model.maxTokens,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullResponse += content
          yield content
        }
      }

      this.recordModelMetric(
        model.id,
        Math.ceil(fullResponse.length / 4),
        Date.now() - startTime,
        true
      )
    } catch (error) {
      logger.error('NVIDIA multimodal stream error:', error)
      this.recordModelMetric(model.id, 0, Date.now() - startTime, false)
      throw new Error('Failed to generate streaming response')
    }
  }

  async generateWithRAG(userId: string, message: string, retrievalQuery?: string): Promise<string> {
    const relevantContext = await this.searchRelevantContext(retrievalQuery || message, userId)
    const systemPrompt = `You are an AI assistant with access to relevant context from previous conversations.
Use the provided context to give more accurate and personalized responses.`

    return this.chat(userId, message, relevantContext, systemPrompt)
  }

  private async searchRelevantContext(query: string, userId: string): Promise<string> {
    try {
      const prisma = await this.bot.db.getPrismaClient()
      const histories = await prisma.chatHistory.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { messages: true },
      })

      const searchTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2)

      const contexts = histories
        .flatMap((history) => this.extractHistoryLines(history.messages))
        .filter((line) =>
          searchTerms.length === 0
            ? true
            : searchTerms.some((term) => line.toLowerCase().includes(term))
        )
        .slice(0, 8)

      return contexts.join('\n---\n')
    } catch (error) {
      logger.error('Failed to search relevant context:', error)
      return ''
    }
  }

  private extractHistoryLines(messages: unknown): string[] {
    if (!Array.isArray(messages)) {
      return []
    }

    return messages
      .map((message) => {
        if (!message || typeof message !== 'object') {
          return null
        }

        const role = 'role' in message ? String(message.role) : 'unknown'
        const content = 'content' in message ? String(message.content) : ''
        if (!content) {
          return null
        }

        return `${role}: ${content}`
      })
      .filter((value): value is string => Boolean(value))
  }

  private recordModelMetric(
    modelName: string,
    tokensUsed: number,
    responseTime: number,
    success: boolean
  ): void {
    const current = this.modelUsageStats.get(modelName) || {
      totalRequests: 0,
      totalTokens: 0,
      totalResponseTime: 0,
      totalErrors: 0,
    }

    current.totalRequests += 1
    current.totalTokens += tokensUsed
    current.totalResponseTime += responseTime
    if (!success) {
      current.totalErrors += 1
    }

    this.modelUsageStats.set(modelName, current)
  }

  async getModelStats(_timeRange: string = '24h'): Promise<ModelMetricSnapshot[]> {
    return [...this.modelUsageStats.entries()]
      .map(([modelName, metric]) => ({
        model_name: modelName,
        total_requests: metric.totalRequests,
        total_tokens: metric.totalTokens,
        avg_response_time:
          metric.totalRequests > 0 ? metric.totalResponseTime / metric.totalRequests : 0,
        total_errors: metric.totalErrors,
        success_rate:
          metric.totalRequests > 0
            ? (metric.totalRequests - metric.totalErrors) / metric.totalRequests
            : 1,
      }))
      .sort((left, right) => right.total_requests - left.total_requests)
  }

  createModelCatalogEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🚀 NVIDIA AI Models')
      .setColor('#76B900')
      .setDescription('Multimodal NVIDIA model catalog available in Mahina')
      .setTimestamp()

    for (const category of ['multimodal', 'reasoning', 'vision', 'general', 'coding']) {
      const models = this.getModelsByCategory(category)
      if (models.length === 0) {
        continue
      }

      embed.addFields({
        name: `${this.getCategoryEmoji(category)} ${category.toUpperCase()}`,
        value: models
          .map((model) => {
            const key = Object.entries(NVIDIA_MULTIMODAL_MODELS).find(
              ([, entry]) => entry.id === model.id
            )?.[0]
            return `\`${key}\` - ${model.name}`
          })
          .join('\n'),
        inline: true,
      })
    }

    return embed
  }

  createEnhancedModelEmbed(): EmbedBuilder {
    return this.createModelCatalogEmbed()
  }

  private getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      multimodal: '🌟',
      reasoning: '🧠',
      vision: '👁️',
      general: '💬',
      coding: '💻',
    }

    return emojis[category] || '🤖'
  }

  async queueAIJob(jobType: string, data: Record<string, unknown>): Promise<string> {
    const queueService = this.bot.services.aiQueue

    if (!queueService?.isAvailable()) {
      throw new Error('AI queue service not available')
    }

    return queueService.queueJob({
      type: jobType as 'embedding' | 'analysis' | 'generation' | 'training' | 'batch_processing',
      userId: String(data.userId || 'system'),
      guildId: String(data.guildId || 'multimodal_service'),
      data,
      priority: Number(data.priority || 0),
    })
  }

  isAvailable(): boolean {
    return true
  }
}

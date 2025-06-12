import OpenAI from 'openai'
import { EmbedBuilder } from 'discord.js'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { Pool } from 'pg'
import { env } from '#src/env'

export interface EnhancedNvidiaModel {
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
  costPerMillion: number // Cost per million tokens
  latency: 'low' | 'medium' | 'high'
}

export const ENHANCED_NVIDIA_MODELS: Record<string, EnhancedNvidiaModel> = {
  // New Llama 4 Models
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
  // Nemotron Models
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
  // Other Advanced Models
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
  // Physical AI Models
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

export class NvidiaEnhancedService {
  private client: OpenAI
  private activeModel: string = 'llama-4-maverick'
  private userModels: Map<string, string> = new Map()
  private modelUsageStats: Map<string, any> = new Map()
  private pgPool: Pool | null = null
  private bot: MahinaBot

  constructor(bot: MahinaBot, apiKey: string) {
    this.bot = bot
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })

    // Initialize PostgreSQL connection for TimescaleDB
    if (env.DATABASE_URL) {
      this.pgPool = new Pool({
        connectionString: env.DATABASE_URL,
      })
    }
  }

  async initialize(): Promise<void> {
    // Test connection
    try {
      if (this.pgPool) {
        await this.pgPool.query('SELECT 1')
        logger.info('NVIDIA Enhanced Service connected to TimescaleDB')
      }
    } catch (error) {
      logger.error('Failed to connect to TimescaleDB:', error)
    }
  }

  setUserModel(userId: string, modelKey: string): boolean {
    if (!ENHANCED_NVIDIA_MODELS[modelKey]) {
      return false
    }
    this.userModels.set(userId, modelKey)
    return true
  }

  getUserModel(userId: string): string {
    return this.userModels.get(userId) || this.activeModel
  }

  getModelInfo(modelKey: string): EnhancedNvidiaModel | null {
    return ENHANCED_NVIDIA_MODELS[modelKey] || null
  }

  getAllModels(): EnhancedNvidiaModel[] {
    return Object.values(ENHANCED_NVIDIA_MODELS)
  }

  getModelsByCategory(category: string): EnhancedNvidiaModel[] {
    return Object.values(ENHANCED_NVIDIA_MODELS).filter((model) => model.category === category)
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
    const model = ENHANCED_NVIDIA_MODELS[modelKey]

    if (!model) {
      throw new Error('Invalid model selected')
    }

    const startTime = Date.now()

    try {
      const messages: any[] = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      if (context) {
        messages.push({ role: 'system', content: `Context: ${context}` })
      }

      // Handle multimodal input if images are provided
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
      const endTime = Date.now()

      // Store interaction in TimescaleDB
      await this.storeInteraction({
        userId,
        message,
        response,
        model: model.id,
        tokensUsed: completion.usage?.total_tokens || 0,
        responseTime: endTime - startTime,
      })

      return response
    } catch (error) {
      logger.error('NVIDIA Enhanced chat error:', error)
      await this.storeError(userId, model.id, error)
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
    const model = ENHANCED_NVIDIA_MODELS[modelKey]

    if (!model || !model.streaming) {
      throw new Error('Model does not support streaming')
    }

    const startTime = Date.now()
    let fullResponse = ''

    try {
      const messages: any[] = []

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

      const endTime = Date.now()

      // Store interaction after streaming completes
      await this.storeInteraction({
        userId,
        message,
        response: fullResponse,
        model: model.id,
        tokensUsed: Math.ceil(fullResponse.length / 4), // Approximate
        responseTime: endTime - startTime,
      })
    } catch (error) {
      logger.error('NVIDIA Enhanced stream error:', error)
      await this.storeError(userId, model.id, error)
      throw new Error('Failed to generate streaming response')
    }
  }

  async generateWithRAG(userId: string, message: string, retrievalQuery?: string): Promise<string> {
    // Use vector search to find relevant context
    const relevantContext = await this.searchRelevantContext(retrievalQuery || message, userId)

    // Generate response with context
    const systemPrompt = `You are an AI assistant with access to relevant context from previous conversations.
Use the provided context to give more accurate and personalized responses.`

    return await this.chat(userId, message, relevantContext, systemPrompt)
  }

  private async searchRelevantContext(query: string, userId: string): Promise<string> {
    if (!this.pgPool) return ''

    try {
      const result = await this.pgPool.query(
        `SELECT * FROM search_ai_interactions($1, $2, $3, $4, $5)`,
        [query, userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(), 10]
      )

      const contexts = result.rows.map((row) => `User: ${row.message}\nAssistant: ${row.response}`)

      return contexts.join('\n---\n')
    } catch (error) {
      logger.error('Failed to search relevant context:', error)
      return ''
    }
  }

  private async storeInteraction(data: {
    userId: string
    message: string
    response: string
    model: string
    tokensUsed: number
    responseTime: number
  }): Promise<void> {
    if (!this.pgPool) return

    try {
      // Generate embedding for the interaction
      const embedding = await this.generateEmbedding(`${data.message} ${data.response}`)

      await this.pgPool.query(
        `INSERT INTO ai_interactions (
          user_id, guild_id, channel_id, interaction_type,
          message, response, model_used, tokens_used,
          response_time_ms, embedding, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11::jsonb)`,
        [
          data.userId,
          'enhanced_service',
          'chat',
          'chat',
          data.message,
          data.response,
          data.model,
          data.tokensUsed,
          data.responseTime,
          embedding ? `[${embedding.join(',')}]` : null,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'enhanced',
          }),
        ]
      )

      // Update model metrics
      await this.updateModelMetrics(data.model, data.tokensUsed, data.responseTime, true)
    } catch (error) {
      logger.error('Failed to store interaction:', error)
    }
  }

  private async storeError(userId: string, model: string, error: any): Promise<void> {
    if (!this.pgPool) return

    try {
      await this.updateModelMetrics(model, 0, 0, false, error.message)
    } catch (err) {
      logger.error('Failed to store error:', err)
    }
  }

  private async updateModelMetrics(
    modelName: string,
    tokensUsed: number,
    responseTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    if (!this.pgPool) return

    try {
      await this.pgPool.query(
        `INSERT INTO ai_model_metrics (
          model_name, request_count, total_tokens,
          avg_response_time_ms, error_count, success_rate, metadata
        ) VALUES ($1, 1, $2, $3, $4, $5, $6::jsonb)`,
        [
          modelName,
          tokensUsed,
          responseTime,
          success ? 0 : 1,
          success ? 1.0 : 0.0,
          JSON.stringify({ error: errorMessage }),
        ]
      )
    } catch (error) {
      logger.error('Failed to update model metrics:', error)
    }
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // This would use NVIDIA's embedding model
      // For now, returning null as placeholder
      return null
    } catch (error) {
      logger.error('Failed to generate embedding:', error)
      return null
    }
  }

  async getModelStats(timeRange: string = '24h'): Promise<any> {
    if (!this.pgPool) return {}

    try {
      const interval = this.parseTimeRange(timeRange)
      const result = await this.pgPool.query(
        `SELECT 
          model_name,
          COUNT(*) as total_requests,
          SUM(total_tokens) as total_tokens,
          AVG(avg_response_time_ms) as avg_response_time,
          SUM(error_count) as total_errors,
          AVG(success_rate) as success_rate
        FROM ai_model_metrics
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY model_name
        ORDER BY total_requests DESC`
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get model stats:', error)
      return []
    }
  }

  private parseTimeRange(range: string): string {
    const mappings: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    }
    return mappings[range] || '24 hours'
  }

  createEnhancedModelEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🚀 NVIDIA AI Models - Enhanced Edition')
      .setColor('#76B900')
      .setDescription('Advanced AI models with multimodal capabilities')
      .setTimestamp()

    // Group models by category
    const categories = ['multimodal', 'reasoning', 'vision', 'general', 'coding']

    for (const category of categories) {
      const models = this.getModelsByCategory(category)
      if (models.length === 0) continue

      const fieldValue = models
        .map((model) => {
          const key = Object.entries(ENHANCED_NVIDIA_MODELS).find(
            ([_, m]) => m.id === model.id
          )?.[0]
          return `\`${key}\` - ${model.name}`
        })
        .join('\n')

      embed.addFields({
        name: `${this.getCategoryEmoji(category)} ${category.toUpperCase()}`,
        value: fieldValue || 'No models',
        inline: true,
      })
    }

    return embed
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

  async queueAIJob(jobType: string, data: any): Promise<string> {
    const jobService = this.bot.services.aiJob

    if (!jobService?.isAvailable()) {
      throw new Error('AI Job Service not available')
    }

    return await jobService.queueJob({
      type: jobType as any,
      userId: data.userId,
      guildId: data.guildId || 'enhanced_service',
      data,
      priority: data.priority || 0,
    })
  }

  isAvailable(): boolean {
    return !!this.client
  }
}

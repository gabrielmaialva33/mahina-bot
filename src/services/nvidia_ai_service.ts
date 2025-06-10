import OpenAI from 'openai'
import { EmbedBuilder } from 'discord.js'
import { logger } from '#common/logger'

export interface NvidiaModel {
  id: string
  name: string
  description: string
  category: 'reasoning' | 'coding' | 'general' | 'vision'
  contextLength: number
  streaming: boolean
  temperature: number
  topP: number
  maxTokens: number
}

export const NVIDIA_MODELS: Record<string, NvidiaModel> = {
  'deepseek-r1': {
    id: 'deepseek-ai/deepseek-r1',
    name: 'DeepSeek R1',
    description: 'Advanced reasoning model with strong analytical capabilities',
    category: 'reasoning',
    contextLength: 8192,
    streaming: false,
    temperature: 0.6,
    topP: 0.7,
    maxTokens: 4096,
  },
  'qwen-coder': {
    id: 'qwen/qwen2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder',
    description: 'Specialized coding assistant for programming tasks',
    category: 'coding',
    contextLength: 32768,
    streaming: false,
    temperature: 0.2,
    topP: 0.7,
    maxTokens: 1024,
  },
  'llama-70b': {
    id: 'meta/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    description: 'General-purpose model with excellent performance',
    category: 'general',
    contextLength: 128000,
    streaming: false,
    temperature: 0.2,
    topP: 0.7,
    maxTokens: 1024,
  },
  'llama-70b-stream': {
    id: 'meta/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B (Streaming)',
    description: 'General-purpose model with streaming support',
    category: 'general',
    contextLength: 128000,
    streaming: true,
    temperature: 0.2,
    topP: 0.7,
    maxTokens: 1024,
  },
}

export class NvidiaAIService {
  private client: OpenAI
  private activeModel: string = 'llama-70b'
  private userModels: Map<string, string> = new Map()

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  }

  setUserModel(userId: string, modelKey: string): boolean {
    if (!NVIDIA_MODELS[modelKey]) {
      return false
    }
    this.userModels.set(userId, modelKey)
    return true
  }

  getUserModel(userId: string): string {
    return this.userModels.get(userId) || this.activeModel
  }

  getModelInfo(modelKey: string): NvidiaModel | null {
    return NVIDIA_MODELS[modelKey] || null
  }

  getAllModels(): NvidiaModel[] {
    return Object.values(NVIDIA_MODELS)
  }

  async chat(
    userId: string,
    message: string,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    const modelKey = this.getUserModel(userId)
    const model = NVIDIA_MODELS[modelKey]

    if (!model) {
      throw new Error('Invalid model selected')
    }

    try {
      const messages: any[] = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      if (context) {
        messages.push({ role: 'system', content: `Context: ${context}` })
      }

      messages.push({ role: 'user', content: message })

      const completion = await this.client.chat.completions.create({
        model: model.id,
        messages,
        temperature: model.temperature,
        top_p: model.topP,
        max_tokens: model.maxTokens,
        stream: false,
      })

      return completion.choices[0]?.message?.content || 'No response generated'
    } catch (error) {
      logger.error('NVIDIA AI chat error:', error)
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
    const model = NVIDIA_MODELS[modelKey]

    if (!model || !model.streaming) {
      throw new Error('Model does not support streaming')
    }

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
          yield content
        }
      }
    } catch (error) {
      logger.error('NVIDIA AI stream error:', error)
      throw new Error('Failed to generate streaming response')
    }
  }

  async analyzeCode(
    userId: string,
    code: string,
    language: string,
    task: 'explain' | 'review' | 'optimize' | 'debug'
  ): Promise<string> {
    const prompts = {
      explain: `Explain this ${language} code in detail:\n\n${code}`,
      review: `Review this ${language} code and provide suggestions for improvements:\n\n${code}`,
      optimize: `Optimize this ${language} code for better performance:\n\n${code}`,
      debug: `Debug this ${language} code and identify any issues:\n\n${code}`,
    }

    // Use coding model for code-related tasks
    const originalModel = this.getUserModel(userId)
    this.setUserModel(userId, 'qwen-coder')

    try {
      const response = await this.chat(userId, prompts[task])
      this.setUserModel(userId, originalModel)
      return response
    } catch (error) {
      this.setUserModel(userId, originalModel)
      throw error
    }
  }

  async reasoning(userId: string, problem: string, context?: string): Promise<string> {
    // Use reasoning model for complex problems
    const originalModel = this.getUserModel(userId)
    this.setUserModel(userId, 'deepseek-r1')

    try {
      const systemPrompt =
        'You are an expert problem solver. Analyze the problem step by step and provide a detailed solution.'
      const response = await this.chat(userId, problem, context, systemPrompt)
      this.setUserModel(userId, originalModel)
      return response
    } catch (error) {
      this.setUserModel(userId, originalModel)
      throw error
    }
  }

  createModelEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('🤖 NVIDIA AI Models')
      .setColor('#76B900')
      .setDescription('Available AI models for enhanced Discord experience')
      .setTimestamp()

    for (const [key, model] of Object.entries(NVIDIA_MODELS)) {
      const features = []
      if (model.streaming) features.push('Streaming')
      features.push(`${model.contextLength} tokens`)
      features.push(model.category)

      embed.addFields({
        name: `${model.name} (\`${key}\`)`,
        value: `${model.description}\n**Features:** ${features.join(' • ')}`,
        inline: false,
      })
    }

    return embed
  }

  createModelStatusEmbed(userId: string): EmbedBuilder {
    const currentModel = this.getUserModel(userId)
    const model = NVIDIA_MODELS[currentModel]

    return new EmbedBuilder()
      .setTitle('🎯 Your AI Model')
      .setColor('#76B900')
      .addFields(
        { name: 'Current Model', value: model?.name || 'Unknown', inline: true },
        { name: 'Category', value: model?.category || 'N/A', inline: true },
        { name: 'Context Length', value: `${model?.contextLength || 0} tokens`, inline: true },
        { name: 'Streaming', value: model?.streaming ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Temperature', value: `${model?.temperature || 0}`, inline: true },
        { name: 'Max Tokens', value: `${model?.maxTokens || 0}`, inline: true }
      )
      .setTimestamp()
  }
}

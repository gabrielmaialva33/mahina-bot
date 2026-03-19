import type MahinaBot from '#common/mahina_bot'
import type { AIModelStatsRow, LegacyAIChatResponse } from '#common/ai_types'
import type { NvidiaModel } from '#src/services/nvidia_ai_service'
import type { NvidiaMultimodalModel } from '#src/services/nvidia_multimodal_service'
import { EmbedBuilder } from 'discord.js'
import OpenAI from 'openai'
import { env } from '#src/env'

type AIModelSummary = NvidiaModel | NvidiaMultimodalModel
type AIRouteProvider = 'nvidia-multimodal' | 'nvidia-legacy' | 'groq' | 'gemini' | 'openai'

interface AIRouteTrace {
  capability: AICapability | 'chat'
  provider: AIRouteProvider
  model: string
  source: 'router' | 'service'
  timestamp: number
}

interface OpenAICompatibleProvider {
  provider: Extract<AIRouteProvider, 'groq' | 'gemini' | 'openai'>
  model: string
  client: OpenAI
  supportsVision: boolean
}

export type AICapability =
  | 'chat'
  | 'stream'
  | 'vision'
  | 'reasoning'
  | 'code'
  | 'rag'
  | 'model-selection'
  | 'model-embed'
  | 'model-stats'

type AIServiceWithChat = {
  chat: (
    userId: string,
    message: string,
    context?: string,
    systemPrompt?: string,
    options?: MultimodalChatOptions | string
  ) => Promise<string | LegacyAIChatResponse>
}

type AIServiceWithStreaming = {
  chatStream: (
    userId: string,
    message: string,
    context?: string,
    systemPrompt?: string
  ) => AsyncGenerator<string, void, unknown>
}

type AIServiceWithModels = {
  getAllModels: () => AIModelSummary[]
  getModelInfo: (modelKey: string) => AIModelSummary | null
  getUserModel: (userId: string) => string
  setUserModel: (userId: string, modelKey: string) => boolean
}

type AIServiceWithEmbeds = {
  createEnhancedModelEmbed?: () => unknown
  createModelEmbed?: () => unknown
  createModelStatusEmbed?: (userId: string) => unknown
}

export interface PreferredAIService
  extends Partial<AIServiceWithStreaming>, Partial<AIServiceWithEmbeds> {
  chat?: AIServiceWithChat['chat']
  getUserModel?: AIServiceWithModels['getUserModel']
  getModelInfo?: AIServiceWithModels['getModelInfo']
  setUserModel?: AIServiceWithModels['setUserModel']
  getAllModels: () => AIModelSummary[]
  getModelStats?: (timeRange?: string) => Promise<AIModelStatsRow[]>
  generateWithRAG?: (userId: string, message: string, retrievalQuery?: string) => Promise<string>
  reasoning?: (userId: string, problem: string, context?: string) => Promise<string>
  analyzeCode?: (
    userId: string,
    code: string,
    language: string,
    task: 'explain' | 'review' | 'optimize' | 'debug'
  ) => Promise<string>
}

interface MultimodalChatOptions {
  stream?: boolean
  temperature?: number
  maxTokens?: number
  images?: string[]
}

interface ChatRequest {
  userId: string
  message: string
  context?: string
  systemPrompt?: string
  imageUrl?: string
  options?: MultimodalChatOptions
}

const lastAIRoutes = new Map<string, AIRouteTrace>()

const recordRoute = (
  userId: string,
  capability: AIRouteTrace['capability'],
  provider: AIRouteProvider,
  model: string,
  source: AIRouteTrace['source']
) => {
  lastAIRoutes.set(userId, {
    capability,
    provider,
    model,
    source,
    timestamp: Date.now(),
  })
}

const buildOpenAICompatibleProviders = (): OpenAICompatibleProvider[] => {
  const providers: OpenAICompatibleProvider[] = []

  if (env.GROQ_API_KEY) {
    providers.push({
      provider: 'groq',
      model: env.AI_FAST_MODEL,
      client: new OpenAI({
        apiKey: env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
      supportsVision: false,
    })
  }

  if (env.GEMINI_API_KEY) {
    providers.push({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      client: new OpenAI({
        apiKey: env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      supportsVision: true,
    })
  }

  if (env.OPENAI_API_KEY) {
    providers.push({
      provider: 'openai',
      model: 'gpt-4o-mini',
      client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
      supportsVision: true,
    })
  }

  return providers
}

const openAICompatibleProviders = buildOpenAICompatibleProviders()

const getOpenAICompatibleProvider = (
  providerName: OpenAICompatibleProvider['provider']
): OpenAICompatibleProvider | null =>
  openAICompatibleProviders.find((provider) => provider.provider === providerName) || null

const isFastChatCandidate = (request: ChatRequest): boolean => {
  if (request.imageUrl) {
    return false
  }

  const messageLength = request.message.trim().length
  const contextLength = request.context?.trim().length || 0
  const systemPromptLength = request.systemPrompt?.trim().length || 0

  return messageLength <= 180 && contextLength <= 500 && systemPromptLength <= 1000
}

const getChatRoutePlan = (request: ChatRequest): AIRouteProvider[] => {
  if (request.imageUrl) {
    return ['nvidia-multimodal', 'gemini', 'openai', 'nvidia-legacy']
  }

  if (isFastChatCandidate(request)) {
    return ['groq', 'nvidia-multimodal', 'gemini', 'openai', 'nvidia-legacy']
  }

  return ['nvidia-multimodal', 'gemini', 'openai', 'groq', 'nvidia-legacy']
}

async function runOpenAICompatibleChat(
  provider: OpenAICompatibleProvider,
  request: ChatRequest
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt })
  }

  if (request.context) {
    messages.push({ role: 'system', content: `Context: ${request.context}` })
  }

  messages.push({
    role: 'user',
    content: request.imageUrl
      ? [
          { type: 'text', text: request.message },
          {
            type: 'image_url',
            image_url: {
              url: request.imageUrl,
            },
          },
        ]
      : request.message,
  })

  const completion = await provider.client.chat.completions.create({
    model: provider.model,
    messages,
    temperature: request.options?.temperature ?? 0.7,
    max_tokens: request.options?.maxTokens ?? 2048,
    stream: false,
  })

  return completion.choices[0]?.message?.content || 'No response generated'
}

async function runServiceChat(
  client: MahinaBot,
  route: Extract<AIRouteProvider, 'nvidia-multimodal' | 'nvidia-legacy'>,
  request: ChatRequest
): Promise<string | null> {
  if (route === 'nvidia-multimodal' && client.services.nvidiaMultimodal) {
    const response = await client.services.nvidiaMultimodal.chat(
      request.userId,
      request.message,
      request.context,
      request.systemPrompt,
      request.options || (request.imageUrl ? { images: [request.imageUrl] } : undefined)
    )
    const modelKey = client.services.nvidiaMultimodal.getUserModel(request.userId)
    const model = client.services.nvidiaMultimodal.getModelInfo(modelKey)

    recordRoute(
      request.userId,
      request.imageUrl ? 'vision' : 'chat',
      'nvidia-multimodal',
      model?.name || modelKey,
      'service'
    )

    return response
  }

  if (route === 'nvidia-legacy' && client.services.nvidia) {
    const response = (await client.services.nvidia.chat(
      request.userId,
      request.message,
      request.context,
      request.systemPrompt,
      request.imageUrl
    )) as string | LegacyAIChatResponse
    const modelKey = client.services.nvidia.getUserModel(request.userId)
    const model = client.services.nvidia.getModelInfo(modelKey)

    recordRoute(
      request.userId,
      request.imageUrl ? 'vision' : 'chat',
      'nvidia-legacy',
      model?.name || modelKey,
      'service'
    )

    return typeof response === 'string' ? response : response.content
  }

  return null
}

type TaskModelSelectionResult =
  | { success: true; service: PreferredAIService; model: AIModelSummary }
  | { success: false; error: 'service-unavailable' | 'model-not-found' | 'unsupported-model' }

export function getPreferredAIService(client: MahinaBot): PreferredAIService | null {
  return client.services.nvidiaMultimodal || client.services.nvidia
}

export function getFallbackAIService(client: MahinaBot): PreferredAIService | null {
  if (client.services.nvidiaMultimodal && client.services.nvidia) {
    return client.services.nvidia
  }

  return getPreferredAIService(client)
}

export function getLastAIRoute(userId: string): AIRouteTrace | null {
  return lastAIRoutes.get(userId) || null
}

export function getAIProviderOverview(client: MahinaBot): Array<{
  provider: string
  role: string
  status: 'ready' | 'off'
}> {
  return [
    {
      provider: 'NVIDIA Multimodal',
      role: 'base de chat e visão',
      status: client.services.nvidiaMultimodal ? 'ready' : 'off',
    },
    {
      provider: 'NVIDIA Legacy',
      role: 'reasoning, code e fallback',
      status: client.services.nvidia ? 'ready' : 'off',
    },
    {
      provider: 'Groq',
      role: 'chat rápido e lurker',
      status: env.GROQ_API_KEY ? 'ready' : 'off',
    },
    {
      provider: 'Gemini',
      role: 'contexto e fallback leve',
      status: env.GEMINI_API_KEY ? 'ready' : 'off',
    },
    {
      provider: 'OpenAI',
      role: 'fallback genérico',
      status: env.OPENAI_API_KEY ? 'ready' : 'off',
    },
  ]
}

export function getAIServiceCapabilities(service: PreferredAIService | null): Set<AICapability> {
  const capabilities = new Set<AICapability>()

  if (!service) {
    return capabilities
  }

  if (service.chat) capabilities.add('chat')
  if (service.chatStream) capabilities.add('stream')
  if (service.setUserModel && service.getUserModel && service.getModelInfo) {
    capabilities.add('model-selection')
  }
  if (service.createEnhancedModelEmbed || service.createModelEmbed) {
    capabilities.add('model-embed')
  }
  if (service.getModelStats) capabilities.add('model-stats')
  if (service.generateWithRAG) capabilities.add('rag')
  if (service.reasoning) capabilities.add('reasoning')
  if (service.analyzeCode) capabilities.add('code')

  const models = service.getAllModels()
  if (models.some((model) => model.category === 'vision' || 'features' in model)) {
    capabilities.add('vision')
  }

  return capabilities
}

export function resolveAIServiceForCapability(
  client: MahinaBot,
  capability: AICapability
): PreferredAIService | null {
  const preferred = getPreferredAIService(client)
  if (getAIServiceCapabilities(preferred).has(capability)) {
    return preferred
  }

  const fallback = getFallbackAIService(client)
  if (fallback !== preferred && getAIServiceCapabilities(fallback).has(capability)) {
    return fallback
  }

  return null
}

export function getAllAvailableAIModels(client: MahinaBot): AIModelSummary[] {
  const multimodalModels = client.services.nvidiaMultimodal?.getAllModels() || []
  const legacyModels = client.services.nvidia?.getAllModels() || []
  const seenModelIds = new Set<string>()

  return [...multimodalModels, ...legacyModels].filter((model) => {
    if (seenModelIds.has(model.id)) {
      return false
    }

    seenModelIds.add(model.id)
    return true
  })
}

export function getAIModelInfo(client: MahinaBot, modelKey: string): AIModelSummary | null {
  return (
    client.services.nvidiaMultimodal?.getModelInfo(modelKey) ||
    client.services.nvidia?.getModelInfo(modelKey) ||
    null
  )
}

export function setUserAIModel(
  client: MahinaBot,
  userId: string,
  modelKey: string
): TaskModelSelectionResult {
  const multimodalModel = client.services.nvidiaMultimodal?.getModelInfo(modelKey)
  if (multimodalModel && client.services.nvidiaMultimodal) {
    return client.services.nvidiaMultimodal.setUserModel(userId, modelKey)
      ? { success: true, service: client.services.nvidiaMultimodal, model: multimodalModel }
      : { success: false, error: 'unsupported-model' }
  }

  const legacyModel = client.services.nvidia?.getModelInfo(modelKey)
  if (legacyModel && client.services.nvidia) {
    return client.services.nvidia.setUserModel(userId, modelKey)
      ? { success: true, service: client.services.nvidia, model: legacyModel }
      : { success: false, error: 'unsupported-model' }
  }

  if (!client.services.nvidiaMultimodal && !client.services.nvidia) {
    return { success: false, error: 'service-unavailable' }
  }

  return { success: false, error: 'model-not-found' }
}

export function getUserSelectedAIModel(client: MahinaBot, userId: string): AIModelSummary | null {
  const multimodalModelKey = client.services.nvidiaMultimodal?.getUserModel(userId)
  if (multimodalModelKey) {
    const multimodalModel = client.services.nvidiaMultimodal?.getModelInfo(multimodalModelKey)
    if (multimodalModel) {
      return multimodalModel
    }
  }

  const legacyModelKey = client.services.nvidia?.getUserModel(userId)
  if (legacyModelKey) {
    return client.services.nvidia?.getModelInfo(legacyModelKey) || null
  }

  return null
}

export async function chatWithPreferredAI(
  client: MahinaBot,
  request: ChatRequest
): Promise<string> {
  for (const route of getChatRoutePlan(request)) {
    if (route === 'nvidia-multimodal' || route === 'nvidia-legacy') {
      try {
        const response = await runServiceChat(client, route, request)
        if (response) {
          return response
        }
      } catch {
        // continue to next route
      }

      continue
    }

    const provider = getOpenAICompatibleProvider(route)

    if (!provider || (request.imageUrl && !provider.supportsVision)) {
      continue
    }

    try {
      const response = await runOpenAICompatibleChat(provider, request)
      recordRoute(
        request.userId,
        request.imageUrl ? 'vision' : 'chat',
        provider.provider,
        provider.model,
        'router'
      )
      return response
    } catch {
      // continue to next route
    }
  }

  const service = request.imageUrl
    ? resolveAIServiceForCapability(client, 'vision')
    : resolveAIServiceForCapability(client, 'chat')

  if (service === client.services.nvidiaMultimodal || service === client.services.nvidia) {
    const route =
      service === client.services.nvidiaMultimodal ? 'nvidia-multimodal' : 'nvidia-legacy'
    const response = await runServiceChat(client, route, request)

    if (response) {
      return response
    }
  }

  throw new Error('AI service is not available')
}

export async function runReasoningTask(
  client: MahinaBot,
  userId: string,
  problem: string,
  context?: string
): Promise<string> {
  const service = resolveAIServiceForCapability(client, 'reasoning')

  if (!service?.reasoning) {
    throw new Error('Reasoning service is not available')
  }
  const response = await service.reasoning(userId, problem, context)
  if (service === client.services.nvidiaMultimodal && client.services.nvidiaMultimodal) {
    const modelKey = client.services.nvidiaMultimodal.getUserModel(userId)
    const model = client.services.nvidiaMultimodal.getModelInfo(modelKey)
    recordRoute(userId, 'reasoning', 'nvidia-multimodal', model?.name || modelKey, 'service')
  } else if (service === client.services.nvidia && client.services.nvidia) {
    const modelKey = client.services.nvidia.getUserModel(userId)
    const model = client.services.nvidia.getModelInfo(modelKey)
    recordRoute(userId, 'reasoning', 'nvidia-legacy', model?.name || modelKey, 'service')
  }
  return response
}

export async function runCodeTask(
  client: MahinaBot,
  userId: string,
  code: string,
  language: string,
  task: 'explain' | 'review' | 'optimize' | 'debug'
): Promise<string> {
  const service = resolveAIServiceForCapability(client, 'code')

  if (!service?.analyzeCode) {
    throw new Error('Code analysis service is not available')
  }
  const response = await service.analyzeCode(userId, code, language, task)
  if (service === client.services.nvidiaMultimodal && client.services.nvidiaMultimodal) {
    const modelKey = client.services.nvidiaMultimodal.getUserModel(userId)
    const model = client.services.nvidiaMultimodal.getModelInfo(modelKey)
    recordRoute(userId, 'code', 'nvidia-multimodal', model?.name || modelKey, 'service')
  } else if (service === client.services.nvidia && client.services.nvidia) {
    const modelKey = client.services.nvidia.getUserModel(userId)
    const model = client.services.nvidia.getModelInfo(modelKey)
    recordRoute(userId, 'code', 'nvidia-legacy', model?.name || modelKey, 'service')
  }
  return response
}

export async function runRagTask(
  client: MahinaBot,
  userId: string,
  message: string,
  retrievalQuery?: string
): Promise<string> {
  const service = resolveAIServiceForCapability(client, 'rag')

  if (!service?.generateWithRAG) {
    throw new Error('RAG service is not available')
  }
  const response = await service.generateWithRAG(userId, message, retrievalQuery)
  if (service === client.services.nvidiaMultimodal && client.services.nvidiaMultimodal) {
    const modelKey = client.services.nvidiaMultimodal.getUserModel(userId)
    const model = client.services.nvidiaMultimodal.getModelInfo(modelKey)
    recordRoute(userId, 'rag', 'nvidia-multimodal', model?.name || modelKey, 'service')
  }
  return response
}

export function createAIModelCatalogEmbed(client: MahinaBot): unknown | null {
  const service = resolveAIServiceForCapability(client, 'model-embed')

  if (!service) {
    return null
  }

  return service.createEnhancedModelEmbed?.() || service.createModelEmbed?.() || null
}

export function createAIModelStatusEmbed(client: MahinaBot, userId: string): EmbedBuilder | null {
  const preferred = getPreferredAIService(client)
  const legacyStatusEmbed = preferred?.createModelStatusEmbed?.(userId)
  if (legacyStatusEmbed instanceof EmbedBuilder) {
    return legacyStatusEmbed
  }

  const model = getUserSelectedAIModel(client, userId)
  if (!model) {
    return null
  }

  return new EmbedBuilder()
    .setTitle('🎯 Modelo Atual')
    .setColor(client.config.color.main)
    .addFields(
      { name: 'Modelo', value: model.name, inline: true },
      { name: 'Categoria', value: model.category, inline: true },
      { name: 'Contexto', value: `${model.contextLength.toLocaleString()} tokens`, inline: true },
      {
        name: 'Streaming',
        value: model.streaming ? '✅ Habilitado' : '❌ Desabilitado',
        inline: true,
      },
      { name: 'Temperatura', value: `${model.temperature}`, inline: true },
      { name: 'Max Tokens', value: `${model.maxTokens.toLocaleString()}`, inline: true }
    )
    .setTimestamp()
}

export function getAIBootSummary(client: MahinaBot): string[] {
  return [
    `music=${client.runtime.music ? 'on' : 'off'}`,
    `ai=${client.runtime.ai ? 'on' : 'off'}`,
    `selfbot=${client.runtime.selfbot ? 'on' : 'off'}`,
    `multimodal=${client.services.nvidiaMultimodal ? 'ready' : 'off'}`,
    `legacy-ai=${client.services.nvidia ? 'ready' : 'off'}`,
    `queue=${client.services.aiQueue ? 'ready' : 'off'}`,
    `lavalink-health=${client.services.lavalinkHealth ? 'ready' : 'off'}`,
  ]
}

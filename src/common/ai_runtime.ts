import type MahinaBot from '#common/mahina_bot'
import type { AIModelStatsRow, LegacyAIChatResponse } from '#common/ai_types'
import type { NvidiaModel } from '#src/services/nvidia_ai_service'
import type { NvidiaMultimodalModel } from '#src/services/nvidia_multimodal_service'
import { EmbedBuilder } from 'discord.js'

type AIModelSummary = NvidiaModel | NvidiaMultimodalModel

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
  ) => Promise<string | LegacyChatResponse>
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
  const service = request.imageUrl
    ? resolveAIServiceForCapability(client, 'vision')
    : resolveAIServiceForCapability(client, 'chat')

  if (service === client.services.nvidiaMultimodal && client.services.nvidiaMultimodal) {
    return client.services.nvidiaMultimodal.chat(
      request.userId,
      request.message,
      request.context,
      request.systemPrompt,
      request.options || (request.imageUrl ? { images: [request.imageUrl] } : undefined)
    )
  }

  if (service === client.services.nvidia && client.services.nvidia) {
    const response = (await client.services.nvidia.chat(
      request.userId,
      request.message,
      request.context,
      request.systemPrompt,
      request.imageUrl
    )) as string | LegacyChatResponse

    return typeof response === 'string' ? response : response.content
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

  return service.reasoning(userId, problem, context)
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

  return service.analyzeCode(userId, code, language, task)
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

  return service.generateWithRAG(userId, message, retrievalQuery)
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

import type MahinaBot from '#common/mahina_bot'
import type { NvidiaModel } from '#src/services/nvidia_ai_service'
import type { NvidiaMultimodalModel } from '#src/services/nvidia_multimodal_service'

type LegacyChatResponse = {
  content: string
  usage?: unknown
}

type AIModelSummary = NvidiaModel | NvidiaMultimodalModel

type ModelStatsRow = {
  model_name: string
  total_requests: number
  total_tokens?: number
  avg_response_time: number
  total_errors?: number
  success_rate: number
}

export interface PreferredAIService {
  setUserModel?: (userId: string, modelKey: string) => boolean
  getAllModels: () => AIModelSummary[]
  getModelStats?: (timeRange?: string) => Promise<ModelStatsRow[]>
  generateWithRAG?: (userId: string, message: string, retrievalQuery?: string) => Promise<string>
}

interface MultimodalChatOptions {
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

export function getPreferredAIService(client: MahinaBot) {
  return client.services.nvidiaMultimodal || client.services.nvidia
}

export async function chatWithPreferredAI(
  client: MahinaBot,
  request: ChatRequest
): Promise<string> {
  if (client.services.nvidiaMultimodal) {
    return client.services.nvidiaMultimodal.chat(
      request.userId,
      request.message,
      request.context,
      request.systemPrompt,
      request.options || (request.imageUrl ? { images: [request.imageUrl] } : undefined)
    )
  }

  if (client.services.nvidia) {
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

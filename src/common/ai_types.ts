export interface AIContextStats {
  totalContexts: number
  totalMessages: number
  contextsByChannel: Record<string, number>
}

export interface AIManagerStatus {
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
}

export interface AIManagerStatistics {
  contextStats: AIContextStats
  modelUsage: Record<string, number>
  totalInteractions: number
}

export interface AIUsageSnapshot {
  totalTokens: number
  totalRequests: number
  totalCost: number
}

export interface AIModelStatsRow {
  model_name: string
  total_requests: number
  total_tokens?: number
  avg_response_time: number
  total_errors?: number
  success_rate: number
}

export interface LegacyAIChatResponse {
  content: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export interface AIFunctionCallResponse extends LegacyAIChatResponse {
  functionCall?: unknown
}

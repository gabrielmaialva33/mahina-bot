import { Collection } from 'discord.js'
import { logger } from '#common/logger'
import type { AIContextStats } from '#common/ai_types'

export interface ConversationContext {
  userId: string
  channelId: string
  messages: ContextMessage[]
  metadata: {
    personality?: string
    language?: string
    preferences?: Record<string, string | number | boolean | string[]>
    lastInteraction: Date
  }
}

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    command?: string
    emotion?: string
    intent?: string
    attachments?: string[]
  }
}

export class AIContextService {
  private contexts: Collection<string, ConversationContext> = new Collection()
  private maxMessagesPerContext = 50
  private contextTTL = 3600000 // 1 hour in milliseconds
  private readonly MAX_CONTEXTS = 1000

  constructor() {
    // Clean up old contexts periodically
    setInterval(() => this.cleanupOldContexts(), 300000) // Every 5 minutes
  }

  /**
   * Get or create context for a user in a channel
   */
  getContext(userId: string, channelId: string): ConversationContext {
    const key = `${userId}-${channelId}`
    let context = this.contexts.get(key)

    if (!context) {
      // Evict oldest contexts if at capacity
      if (this.contexts.size >= this.MAX_CONTEXTS) {
        this.cleanupOldContexts()

        // If still at capacity after TTL cleanup, evict the oldest by lastInteraction
        if (this.contexts.size >= this.MAX_CONTEXTS) {
          let oldestKey: string | null = null
          let oldestTime = Infinity

          for (const [k, ctx] of this.contexts) {
            const time = ctx.metadata.lastInteraction.getTime()
            if (time < oldestTime) {
              oldestTime = time
              oldestKey = k
            }
          }

          if (oldestKey) {
            this.contexts.delete(oldestKey)
          }
        }
      }

      context = {
        userId,
        channelId,
        messages: [],
        metadata: {
          lastInteraction: new Date(),
        },
      }
      this.contexts.set(key, context)
    }

    // Update last interaction
    context.metadata.lastInteraction = new Date()
    return context
  }

  /**
   * Add a message to the context
   */
  addMessage(userId: string, channelId: string, message: ContextMessage): void {
    const context = this.getContext(userId, channelId)
    context.messages.push(message)

    // Maintain message limit
    if (context.messages.length > this.maxMessagesPerContext) {
      // Keep system messages and recent messages
      const systemMessages = context.messages.filter((m) => m.role === 'system')
      const otherMessages = context.messages.filter((m) => m.role !== 'system')

      context.messages = [
        ...systemMessages,
        ...otherMessages.slice(-this.maxMessagesPerContext + systemMessages.length),
      ]
    }

    logger.debug(`Added message to context ${userId}-${channelId}`)
  }

  /**
   * Get conversation history for AI processing
   */
  getConversationHistory(userId: string, channelId: string, limit = 10): ContextMessage[] {
    const context = this.getContext(userId, channelId)
    return context.messages.slice(-limit)
  }

  /**
   * Update user preferences in context
   */
  updateUserPreferences(
    userId: string,
    channelId: string,
    preferences: Record<string, string | number | boolean | string[]>
  ): void {
    const context = this.getContext(userId, channelId)
    context.metadata.preferences = {
      ...context.metadata.preferences,
      ...preferences,
    }
  }

  /**
   * Set personality for a context
   */
  setPersonality(userId: string, channelId: string, personality: string): void {
    const context = this.getContext(userId, channelId)
    context.metadata.personality = personality
  }

  /**
   * Analyze message intent and emotion
   */
  async analyzeMessage(content: string): Promise<{
    intent?: string
    emotion?: string
    topics?: string[]
  }> {
    // Simple intent detection (can be enhanced with AI)
    const intents = {
      help: /\b(help|ajuda|como|how|tutorial)\b/i,
      music: /\b(music|música|play|tocar|song|canção|playlist)\b/i,
      greeting: /\b(hi|hello|olá|oi|hey|bom dia|boa tarde|boa noite)\b/i,
      thanks: /\b(thanks|thank you|obrigado|obrigada|valeu|vlw)\b/i,
      goodbye: /\b(bye|goodbye|tchau|até|see you|flw)\b/i,
      question: /\?|^(what|where|when|who|why|how|qual|onde|quando|quem|por que|como)/i,
    }

    const emotions = {
      happy: /\b(happy|feliz|alegre|😊|😄|🎉|❤️|amo|love)\b/i,
      sad: /\b(sad|triste|😢|😔|💔|chateado)\b/i,
      angry: /\b(angry|raiva|irritado|😠|😡|🤬|puto)\b/i,
      confused: /\b(confused|confuso|não entendi|🤔|😕|❓)\b/i,
      excited: /\b(excited|animado|empolgado|🎊|🚀|wow|uau)\b/i,
    }

    const detectedIntent = Object.entries(intents).find(([_, regex]) => regex.test(content))?.[0]

    const detectedEmotion = Object.entries(emotions).find(([_, regex]) => regex.test(content))?.[0]

    // Extract topics (simple keyword extraction)
    const topics = content
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => {
        const stopwords = new Set([
          'para',
          'with',
          'from',
          'that',
          'this',
          'como',
          'mais',
          'muito',
          'tambem',
          'também',
          'aqui',
          'quando',
          'onde',
          'porque',
          'então',
          'entao',
          'voce',
          'você',
          'esse',
          'essa',
          'isso',
          'desse',
          'dessa',
          'sobre',
          'ainda',
          'depois',
          'antes',
          'entre',
          'outro',
          'outra',
          'cada',
          'mesmo',
          'mesma',
          'todo',
          'toda',
          'todos',
          'todas',
        ])
        return word.length > 4 && !stopwords.has(word)
      })
      .slice(0, 5)

    return {
      intent: detectedIntent,
      emotion: detectedEmotion,
      topics: topics.length > 0 ? topics : undefined,
    }
  }

  /**
   * Clear context for a user/channel
   */
  clearContext(userId: string, channelId: string): void {
    const key = `${userId}-${channelId}`
    this.contexts.delete(key)
    logger.debug(`Cleared context for ${key}`)
  }

  /**
   * Clean up old contexts
   */
  private cleanupOldContexts(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, context] of this.contexts) {
      if (now - context.metadata.lastInteraction.getTime() > this.contextTTL) {
        this.contexts.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old contexts`)
    }
  }

  /**
   * Get context statistics
   */
  getStats(): AIContextStats {
    const stats: AIContextStats = {
      totalContexts: this.contexts.size,
      totalMessages: 0,
      contextsByChannel: {},
    }

    for (const context of this.contexts.values()) {
      stats.totalMessages += context.messages.length

      if (!stats.contextsByChannel[context.channelId]) {
        stats.contextsByChannel[context.channelId] = 0
      }
      stats.contextsByChannel[context.channelId]++
    }

    return stats
  }

  /**
   * Export context for analysis or backup
   */
  exportContext(userId: string, channelId: string): string {
    const context = this.getContext(userId, channelId)
    return JSON.stringify(context, null, 2)
  }

  /**
   * Import context from backup
   */
  importContext(data: string): boolean {
    try {
      const context = JSON.parse(data) as ConversationContext
      const key = `${context.userId}-${context.channelId}`

      // Convert date strings back to Date objects
      context.metadata.lastInteraction = new Date(context.metadata.lastInteraction)
      context.messages.forEach((msg) => {
        msg.timestamp = new Date(msg.timestamp)
      })

      this.contexts.set(key, context)
      return true
    } catch (error) {
      logger.error('Failed to import context:', error)
      return false
    }
  }
}

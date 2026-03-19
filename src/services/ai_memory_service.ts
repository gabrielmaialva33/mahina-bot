import { PrismaClient } from '@prisma/client'
import { logger } from '#common/logger'

export interface UserFact {
  fact: string
  source: 'extracted' | 'explicit'
  confidence: number
  createdAt: Date
  lastMentioned: Date
}

export interface UserRelationships {
  closeness: number // 0-100
  lastRoast: string
  insideJokes: string[]
  nickname?: string
}

export interface UserMemory {
  userId: string
  guildId: string
  preferences: {
    musicGenres?: string[]
    favoriteArtists?: string[]
    aiPersonality?: string
    language?: string
    responseStyle?: 'short' | 'detailed' | 'balanced'
    interests?: string[]
  }
  interactions: {
    totalMessages: number
    lastSeen: Date
    favoriteCommands: Record<string, number>
    sentiment: {
      positive: number
      neutral: number
      negative: number
    }
  }
  learning: {
    topics: Record<string, number>
    patterns: string[]
    feedback: {
      helpful: number
      unhelpful: number
    }
  }
  facts: UserFact[]
  relationships: UserRelationships
}

export class AIMemoryService {
  private prisma: PrismaClient
  private memoryCache: Map<string, UserMemory> = new Map()
  private saveInterval: NodeJS.Timeout
  private dirtyKeys: Set<string> = new Set()
  private closenessLastUpdated: Map<string, number> = new Map()
  private cacheAccessTime: Map<string, number> = new Map()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma

    // Save memory to database periodically
    this.saveInterval = setInterval(() => this.persistMemories(), 60000) // Every minute
  }

  /**
   * Get or create user memory
   */
  async getUserMemory(userId: string, guildId: string): Promise<UserMemory> {
    const key = `${userId}-${guildId}`

    // Check cache first
    let memory = this.memoryCache.get(key)
    if (memory) {
      this.cacheAccessTime.set(key, Date.now())
      return memory
    }

    // Try to load from database
    try {
      const dbMemory = await this.prisma.aIMemory.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      })

      if (dbMemory) {
        memory = JSON.parse(dbMemory.data as string) as UserMemory
        // Migrate legacy memories missing facts/relationships fields
        if (!memory.facts) memory.facts = []
        if (!memory.relationships) {
          memory.relationships = { closeness: 0, lastRoast: '', insideJokes: [] }
        }
        this.memoryCache.set(key, memory)
        this.cacheAccessTime.set(key, Date.now())
        return memory
      }
    } catch (error) {
      logger.error('Failed to load user memory:', error)
    }

    // Create new memory
    memory = this.createDefaultMemory(userId, guildId)
    this.memoryCache.set(key, memory)
    this.cacheAccessTime.set(key, Date.now())
    this.markDirty(userId, guildId)
    return memory
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    guildId: string,
    preferences: Partial<UserMemory['preferences']>
  ): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)
    memory.preferences = {
      ...memory.preferences,
      ...preferences,
    }

    this.markDirty(userId, guildId)
    logger.debug(`Updated preferences for user ${userId} in guild ${guildId}`)
  }

  /**
   * Record user interaction
   */
  async recordInteraction(
    userId: string,
    guildId: string,
    command: string,
    sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  ): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)

    // Update interaction stats
    memory.interactions.totalMessages++
    memory.interactions.lastSeen = new Date()

    // Track command usage
    if (!memory.interactions.favoriteCommands[command]) {
      memory.interactions.favoriteCommands[command] = 0
    }
    memory.interactions.favoriteCommands[command]++

    // Update sentiment
    memory.interactions.sentiment[sentiment]++

    this.markDirty(userId, guildId)
  }

  /**
   * Learn from user behavior
   */
  async learn(userId: string, guildId: string, topic: string, pattern?: string): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)

    // Track topics
    if (!memory.learning.topics[topic]) {
      memory.learning.topics[topic] = 0
    }
    memory.learning.topics[topic]++

    // Store unique patterns
    if (pattern && !memory.learning.patterns.includes(pattern)) {
      memory.learning.patterns.push(pattern)

      // Keep only recent patterns
      if (memory.learning.patterns.length > 50) {
        memory.learning.patterns = memory.learning.patterns.slice(-50)
      }
    }

    this.markDirty(userId, guildId)
  }

  /**
   * Record feedback
   */
  async recordFeedback(userId: string, guildId: string, helpful: boolean): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)

    if (helpful) {
      memory.learning.feedback.helpful++
    } else {
      memory.learning.feedback.unhelpful++
    }

    this.markDirty(userId, guildId)
  }

  /**
   * Get user insights
   */
  async getUserInsights(
    userId: string,
    guildId: string
  ): Promise<{
    favoriteGenres: string[]
    topCommands: string[]
    interests: string[]
    personality: string
    sentiment: string
    helpfulnessRate: number
  }> {
    const memory = await this.getUserMemory(userId, guildId)

    // Calculate top commands
    const topCommands = Object.entries(memory.interactions.favoriteCommands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cmd]) => cmd)

    // Calculate overall sentiment
    const { positive, neutral, negative } = memory.interactions.sentiment
    const total = positive + neutral + negative
    let sentiment = 'neutral'

    if (total > 0) {
      const positiveRate = positive / total
      const negativeRate = negative / total

      if (positiveRate > 0.6) sentiment = 'positive'
      else if (negativeRate > 0.4) sentiment = 'negative'
    }

    // Calculate helpfulness rate
    const { helpful, unhelpful } = memory.learning.feedback
    const totalFeedback = helpful + unhelpful
    const helpfulnessRate = totalFeedback > 0 ? helpful / totalFeedback : 0.5

    return {
      favoriteGenres: memory.preferences.musicGenres || [],
      topCommands,
      interests: memory.preferences.interests || [],
      personality: memory.preferences.aiPersonality || 'friendly',
      sentiment,
      helpfulnessRate,
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    userId: string,
    guildId: string
  ): Promise<{
    music: string[]
    commands: string[]
    tips: string[]
  }> {
    const memory = await this.getUserMemory(userId, guildId)
    const insights = await this.getUserInsights(userId, guildId)

    const recommendations = {
      music: [] as string[],
      commands: [] as string[],
      tips: [] as string[],
    }

    // Music recommendations based on genres and artists
    if (memory.preferences.musicGenres?.length) {
      recommendations.music.push(
        `Que tal explorar mais músicas de ${memory.preferences.musicGenres[0]}?`
      )
    }

    // Command recommendations based on usage patterns
    const underusedCommands = ['playlist', 'filter', 'queue', 'nowplaying'].filter(
      (cmd) => !insights.topCommands.includes(cmd)
    )

    if (underusedCommands.length > 0) {
      recommendations.commands.push(`Você pode gostar do comando \`${underusedCommands[0]}\`!`)
    }

    // Tips based on behavior
    if (insights.helpfulnessRate < 0.5) {
      recommendations.tips.push('Tenta ser mais específico nos pedidos pra eu te ajudar melhor!')
    }

    if (memory.interactions.totalMessages < 10) {
      recommendations.tips.push(
        'Explora mais funcionalidades! Me pergunta sobre recomendações de música.'
      )
    }

    return recommendations
  }

  /**
   * Check if two facts are semantically duplicate using normalized comparison + word overlap.
   */
  private isFactDuplicate(existing: string, newFact: string): boolean {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-záàâãéèêíïóôõöúüç\s]/g, '')
        .trim()
    const a = normalize(existing)
    const b = normalize(newFact)

    // Exact match
    if (a === b) return true

    // Substring containment
    if (a.includes(b) || b.includes(a)) return true

    // Word overlap: if 70%+ words match, consider duplicate
    const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 2))
    const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 2))
    if (wordsA.size === 0 || wordsB.size === 0) return false

    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length
    const smaller = Math.min(wordsA.size, wordsB.size)
    return intersection / smaller >= 0.7
  }

  /**
   * Add a fact about a user, deduplicating similar ones.
   */
  async addFact(
    userId: string,
    guildId: string,
    fact: string,
    source: 'extracted' | 'explicit' = 'extracted',
    confidence: number = 0.7
  ): Promise<boolean> {
    const memory = await this.getUserMemory(userId, guildId)

    // Deduplicate against existing facts
    const isDuplicate = memory.facts.some((f) => this.isFactDuplicate(f.fact, fact))

    if (isDuplicate) {
      // Bump confidence and timestamp on existing match
      const existing = memory.facts.find((f) => this.isFactDuplicate(f.fact, fact))
      if (existing) {
        existing.lastMentioned = new Date()
        existing.confidence = Math.min(1, existing.confidence + 0.1)
      }
      this.markDirty(userId, guildId)
      return false
    }

    memory.facts.push({
      fact: fact.trim(),
      source,
      confidence,
      createdAt: new Date(),
      lastMentioned: new Date(),
    })

    // Cap at 50 facts, evict lowest confidence / oldest first
    if (memory.facts.length > 50) {
      memory.facts.sort(
        (a, b) =>
          b.confidence - a.confidence || b.lastMentioned.getTime() - a.lastMentioned.getTime()
      )
      memory.facts = memory.facts.slice(0, 50)
    }

    this.markDirty(userId, guildId)
    return true
  }

  /**
   * Get top relevant facts about a user, sorted by confidence and recency.
   */
  async getFacts(userId: string, guildId: string, limit: number = 20): Promise<UserFact[]> {
    const memory = await this.getUserMemory(userId, guildId)
    return [...memory.facts]
      .sort(
        (a, b) =>
          b.confidence - a.confidence || b.lastMentioned.getTime() - a.lastMentioned.getTime()
      )
      .slice(0, limit)
  }

  /**
   * Increment closeness score for the user-Mahina relationship.
   * Enforces a 30-second cooldown between updates to prevent rapid growth.
   */
  async updateCloseness(userId: string, guildId: string, increment: number = 1): Promise<number> {
    const key = `${userId}-${guildId}`
    const now = Date.now()
    const last = this.closenessLastUpdated.get(key) || 0

    // Minimum 30 seconds between closeness updates
    if (now - last < 30000) {
      const cached = await this.getUserMemory(userId, guildId)
      return cached.relationships.closeness
    }

    this.closenessLastUpdated.set(key, now)
    const memory = await this.getUserMemory(userId, guildId)
    memory.relationships.closeness = Math.min(100, memory.relationships.closeness + increment)
    this.markDirty(userId, guildId)
    return memory.relationships.closeness
  }

  /**
   * Set a nickname Mahina gave to the user.
   */
  async setNickname(userId: string, guildId: string, nickname: string): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)
    memory.relationships.nickname = nickname
    this.markDirty(userId, guildId)
  }

  /**
   * Add an inside joke to the relationship.
   */
  async addInsideJoke(userId: string, guildId: string, joke: string): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)
    if (!memory.relationships.insideJokes.includes(joke)) {
      memory.relationships.insideJokes.push(joke)
      if (memory.relationships.insideJokes.length > 10) {
        memory.relationships.insideJokes = memory.relationships.insideJokes.slice(-10)
      }
      this.markDirty(userId, guildId)
    }
  }

  /**
   * Get the relationship data for a user.
   */
  async getRelationships(userId: string, guildId: string): Promise<UserRelationships> {
    const memory = await this.getUserMemory(userId, guildId)
    return memory.relationships
  }

  /**
   * Mark a memory entry as modified so it gets persisted on the next cycle.
   */
  private markDirty(userId: string, guildId: string): void {
    this.dirtyKeys.add(`${userId}-${guildId}`)
  }

  private createDefaultMemory(userId: string, guildId: string): UserMemory {
    return {
      userId,
      guildId,
      preferences: {
        responseStyle: 'balanced',
      },
      interactions: {
        totalMessages: 0,
        lastSeen: new Date(),
        favoriteCommands: {},
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
      },
      learning: {
        topics: {},
        patterns: [],
        feedback: {
          helpful: 0,
          unhelpful: 0,
        },
      },
      facts: [],
      relationships: {
        closeness: 0,
        lastRoast: '',
        insideJokes: [],
      },
    }
  }

  /**
   * Persist only dirty memories to database, then evict stale cache entries.
   */
  private async persistMemories(): Promise<void> {
    const keysToSave = [...this.dirtyKeys]
    let saved = 0

    for (const key of keysToSave) {
      const memory = this.memoryCache.get(key)
      if (!memory) continue

      try {
        await this.prisma.aIMemory.upsert({
          where: {
            userId_guildId: {
              userId: memory.userId,
              guildId: memory.guildId,
            },
          },
          create: {
            userId: memory.userId,
            guildId: memory.guildId,
            data: JSON.stringify(memory),
          },
          update: {
            data: JSON.stringify(memory),
            updatedAt: new Date(),
          },
        })
        saved++
      } catch (error) {
        logger.error(`Failed to persist memory for ${key}:`, error)
      }
    }

    this.dirtyKeys.clear()

    if (saved > 0) {
      logger.debug(`Persisted ${saved} dirty user memories`)
    }

    // LRU eviction: remove cache entries not accessed in the last hour
    const now = Date.now()
    const oneHour = 3600000

    for (const [key, lastAccess] of this.cacheAccessTime) {
      if (now - lastAccess > oneHour) {
        this.memoryCache.delete(key)
        this.cacheAccessTime.delete(key)
      }
    }

    // Hard cap: if still above 500 entries, evict oldest accessed
    if (this.memoryCache.size > 500) {
      const sorted = [...this.cacheAccessTime.entries()].sort(([, a], [, b]) => a - b)
      const toEvict = sorted.slice(0, this.memoryCache.size - 500)

      for (const [key] of toEvict) {
        this.memoryCache.delete(key)
        this.cacheAccessTime.delete(key)
      }

      logger.debug(`Evicted ${toEvict.length} stale memory cache entries`)
    }
  }

  /**
   * Clean up service
   */
  destroy(): void {
    clearInterval(this.saveInterval)
    this.persistMemories().catch((error) => {
      logger.error('Failed to persist memories on shutdown:', error)
    })
  }
}

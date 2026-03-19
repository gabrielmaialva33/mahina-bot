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
        // Migrate old memories without facts/relationships
        if (!memory.facts) memory.facts = []
        if (!memory.relationships) {
          memory.relationships = { closeness: 0, lastRoast: '', insideJokes: [] }
        }
        this.memoryCache.set(key, memory)
        return memory
      }
    } catch (error) {
      logger.error('Failed to load user memory:', error)
    }

    // Create new memory
    memory = this.createDefaultMemory(userId, guildId)
    this.memoryCache.set(key, memory)
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
      recommendations.music.push(`Try exploring more ${memory.preferences.musicGenres[0]} music!`)
    }

    // Command recommendations based on usage patterns
    const underusedCommands = ['playlist', 'filter', 'queue', 'nowplaying'].filter(
      (cmd) => !insights.topCommands.includes(cmd)
    )

    if (underusedCommands.length > 0) {
      recommendations.commands.push(`You might enjoy the \`${underusedCommands[0]}\` command!`)
    }

    // Tips based on behavior
    if (insights.helpfulnessRate < 0.5) {
      recommendations.tips.push('Try being more specific in your requests for better results!')
    }

    if (memory.interactions.totalMessages < 10) {
      recommendations.tips.push('Explore more features! Try asking me about music recommendations.')
    }

    return recommendations
  }

  /**
   * Create default memory structure
   */
  /**
   * Add a fact about a user, deduplicating similar facts
   */
  async addFact(
    userId: string,
    guildId: string,
    fact: string,
    source: 'extracted' | 'explicit' = 'extracted',
    confidence: number = 0.7
  ): Promise<boolean> {
    const memory = await this.getUserMemory(userId, guildId)
    const lowerFact = fact.toLowerCase().trim()

    // Deduplicate: check if a similar fact already exists
    const isDuplicate = memory.facts.some((f) => {
      const existing = f.fact.toLowerCase()
      return existing === lowerFact || existing.includes(lowerFact) || lowerFact.includes(existing)
    })

    if (isDuplicate) {
      // Update lastMentioned on existing similar fact
      const existing = memory.facts.find((f) => {
        const e = f.fact.toLowerCase()
        return e === lowerFact || e.includes(lowerFact) || lowerFact.includes(e)
      })
      if (existing) {
        existing.lastMentioned = new Date()
        existing.confidence = Math.min(1, existing.confidence + 0.1)
      }
      return false
    }

    memory.facts.push({
      fact: fact.trim(),
      source,
      confidence,
      createdAt: new Date(),
      lastMentioned: new Date(),
    })

    // Keep max 50 facts, remove lowest confidence oldest first
    if (memory.facts.length > 50) {
      memory.facts.sort(
        (a, b) =>
          b.confidence - a.confidence || b.lastMentioned.getTime() - a.lastMentioned.getTime()
      )
      memory.facts = memory.facts.slice(0, 50)
    }

    return true
  }

  /**
   * Get top relevant facts about a user
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
   * Increment closeness score for user-Mahina relationship
   */
  async updateCloseness(userId: string, guildId: string, increment: number = 1): Promise<number> {
    const memory = await this.getUserMemory(userId, guildId)
    memory.relationships.closeness = Math.min(100, memory.relationships.closeness + increment)
    return memory.relationships.closeness
  }

  /**
   * Set a nickname Mahina gave to the user
   */
  async setNickname(userId: string, guildId: string, nickname: string): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)
    memory.relationships.nickname = nickname
  }

  /**
   * Add an inside joke
   */
  async addInsideJoke(userId: string, guildId: string, joke: string): Promise<void> {
    const memory = await this.getUserMemory(userId, guildId)
    if (!memory.relationships.insideJokes.includes(joke)) {
      memory.relationships.insideJokes.push(joke)
      if (memory.relationships.insideJokes.length > 10) {
        memory.relationships.insideJokes = memory.relationships.insideJokes.slice(-10)
      }
    }
  }

  /**
   * Get the relationship data
   */
  async getRelationships(userId: string, guildId: string): Promise<UserRelationships> {
    const memory = await this.getUserMemory(userId, guildId)
    return memory.relationships
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
   * Persist memories to database
   */
  private async persistMemories(): Promise<void> {
    const memories = Array.from(this.memoryCache.entries())

    for (const [key, memory] of memories) {
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
      } catch (error) {
        logger.error(`Failed to persist memory for ${key}:`, error)
      }
    }

    logger.debug(`Persisted ${memories.length} user memories`)
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

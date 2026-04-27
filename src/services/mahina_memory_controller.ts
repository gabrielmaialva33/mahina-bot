import { randomUUID } from 'node:crypto'
import { QdrantClient } from '@qdrant/js-client-rest'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type MahinaMemoryType =
  | 'utterance'
  | 'assistant'
  | 'fact'
  | 'reflection'
  | 'episodic'
  | 'semantic'
  | 'social'
  | 'procedural'

export type MahinaMemoryScope = 'personal' | 'guild' | 'channel'

export interface MahinaMemoryWrite {
  text: string
  userId?: string
  guildId: string
  channelId?: string
  type: MahinaMemoryType
  scope: MahinaMemoryScope
  topics?: string[]
  entityIds?: string[]
  importance?: number
  confidence?: number
  source?: string
  metadata?: Record<string, JsonValue | undefined>
}

export interface MahinaMemorySearchOptions {
  query: string
  guildId: string
  userId?: string
  channelId?: string
  scopes?: MahinaMemoryScope[]
  types?: MahinaMemoryType[]
  topics?: string[]
  limit?: number
  minScore?: number
}

export interface RetrievedMahinaMemory {
  id: string | number
  text: string
  type: MahinaMemoryType
  scope: MahinaMemoryScope
  score: number
  vectorScore: number
  importance: number
  confidence: number
  createdAt: string
  topics: string[]
}

interface MemoryPayload {
  text?: string
  userId?: string
  guildId?: string
  channelId?: string
  type?: string
  scope?: string
  topics?: string[]
  entityIds?: string[]
  importance?: number
  confidence?: number
  source?: string
  createdAt?: string
  timestamp?: number
  [key: string]: JsonValue | undefined
}

const QDRANT_COLLECTION = 'mahina_memories'
const EMBEDDING_DIMENSIONS = 1024
const INDEX_FIELDS: Array<{ name: string; schema: 'keyword' | 'datetime' }> = [
  { name: 'guildId', schema: 'keyword' },
  { name: 'userId', schema: 'keyword' },
  { name: 'channelId', schema: 'keyword' },
  { name: 'type', schema: 'keyword' },
  { name: 'scope', schema: 'keyword' },
  { name: 'topics', schema: 'keyword' },
  { name: 'createdAt', schema: 'datetime' },
]

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export class MahinaMemoryController {
  private qdrant?: QdrantClient
  private ready = false

  constructor(private bot: MahinaBot) {
    this.initialize().catch(() => {})
  }

  isReady(): boolean {
    return this.ready
  }

  async initialize(): Promise<void> {
    try {
      this.qdrant = new QdrantClient({ url: env.QDRANT_URL, checkCompatibility: false })

      const collections = await this.qdrant.getCollections()
      const exists = collections.collections.some((c) => c.name === QDRANT_COLLECTION)

      if (!exists) {
        await this.qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
        })
        logger.info(`Qdrant: created collection "${QDRANT_COLLECTION}"`)
      }

      await this.ensurePayloadIndexes()
      this.ready = true
      logger.info('MahinaMemoryController: Qdrant ready')
    } catch {
      this.ready = false
      logger.warn('MahinaMemoryController: Qdrant unavailable, semantic memory disabled')
    }
  }

  async store(memory: MahinaMemoryWrite): Promise<void> {
    if (!this.ready || !this.qdrant || !this.bot.services.nvidiaEmbedding) return
    if (!memory.text.trim()) return

    try {
      const embedding = await this.bot.services.nvidiaEmbedding.getEmbedding(memory.text)
      if (!embedding) return

      const now = new Date()
      const payload: MemoryPayload = {
        ...memory.metadata,
        text: memory.text,
        userId: memory.userId,
        guildId: memory.guildId,
        channelId: memory.channelId,
        type: memory.type,
        scope: memory.scope,
        topics: memory.topics?.slice(0, 12) ?? [],
        entityIds: memory.entityIds?.slice(0, 12) ?? [],
        importance: clamp(memory.importance ?? this.defaultImportance(memory.type)),
        confidence: clamp(memory.confidence ?? 0.75),
        source: memory.source,
        createdAt: now.toISOString(),
        timestamp: now.getTime(),
      }

      await this.qdrant.upsert(QDRANT_COLLECTION, {
        points: [{ id: randomUUID(), vector: embedding, payload }],
      })
    } catch {
      logger.debug('MahinaMemoryController: store failed (non-critical)')
    }
  }

  async search(options: MahinaMemorySearchOptions): Promise<RetrievedMahinaMemory[]> {
    if (!this.ready || !this.qdrant || !this.bot.services.nvidiaEmbedding) return []

    try {
      const embedding = await this.bot.services.nvidiaEmbedding.getEmbedding(options.query)
      if (!embedding) return []

      const results = await this.qdrant.query(QDRANT_COLLECTION, {
        query: embedding,
        limit: Math.max((options.limit ?? 8) * 4, 16),
        filter: this.buildFilter(options),
        with_payload: true,
        with_vector: false,
      })

      return this.rerank(
        results.points.map((point) => ({
          id: point.id,
          score: point.score ?? 0,
          payload: point.payload as MemoryPayload | undefined,
        })),
        options
      )
    } catch {
      logger.debug('MahinaMemoryController: search failed (non-critical)')
      return []
    }
  }

  formatForPrompt(memories: RetrievedMahinaMemory[]): string[] {
    return memories.map((memory) => {
      const topicHint = memory.topics.length > 0 ? ` [${memory.topics.slice(0, 3).join(', ')}]` : ''
      return `${memory.text}${topicHint}`
    })
  }

  private async ensurePayloadIndexes(): Promise<void> {
    if (!this.qdrant) return

    await Promise.all(
      INDEX_FIELDS.map(async (field) => {
        try {
          await this.qdrant!.createPayloadIndex(QDRANT_COLLECTION, {
            field_name: field.name,
            field_schema: field.schema,
          })
        } catch {
          // Existing indexes or older Qdrant versions should not disable memory.
        }
      })
    )
  }

  private buildFilter(options: MahinaMemorySearchOptions): Record<string, unknown> {
    const must: Record<string, unknown>[] = [{ key: 'guildId', match: { value: options.guildId } }]
    const should: Record<string, unknown>[] = []

    if (options.scopes?.length) {
      must.push({ key: 'scope', match: { any: options.scopes } })
    }

    if (options.types?.length) {
      must.push({ key: 'type', match: { any: options.types } })
    }

    if (options.channelId && options.scopes?.length === 1 && options.scopes[0] === 'channel') {
      must.push({ key: 'channelId', match: { value: options.channelId } })
    } else if (options.channelId && options.scopes?.includes('channel')) {
      should.push({ key: 'channelId', match: { value: options.channelId } })
    }

    if (options.userId && options.scopes?.length === 1 && options.scopes[0] === 'personal') {
      must.push({ key: 'userId', match: { value: options.userId } })
    } else if (options.userId && options.scopes?.includes('personal')) {
      should.push({ key: 'userId', match: { value: options.userId } })
    }

    if (options.topics?.length) {
      should.push({ key: 'topics', match: { any: options.topics.slice(0, 8) } })
    }

    return should.length > 0 ? { must, should } : { must }
  }

  private rerank(
    points: Array<{ id: string | number; score: number; payload?: MemoryPayload }>,
    options: MahinaMemorySearchOptions
  ): RetrievedMahinaMemory[] {
    const seen = new Set<string>()
    const minScore = options.minScore ?? 0.55

    return points
      .map((point) => this.toRetrievedMemory(point, options))
      .filter((memory): memory is RetrievedMahinaMemory => Boolean(memory))
      .filter((memory) => {
        const key = memory.text.toLowerCase().trim()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return memory.score >= minScore
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 8)
  }

  private toRetrievedMemory(
    point: { id: string | number; score: number; payload?: MemoryPayload },
    options: MahinaMemorySearchOptions
  ): RetrievedMahinaMemory | null {
    const payload = point.payload
    if (!payload?.text) return null

    const type = this.normalizeType(payload.type)
    const scope = this.normalizeScope(payload.scope)
    const importance = clamp(typeof payload.importance === 'number' ? payload.importance : 0.5)
    const confidence = clamp(typeof payload.confidence === 'number' ? payload.confidence : 0.7)
    const createdAt = this.getCreatedAt(payload)
    const ageDays = Math.max(0, (Date.now() - createdAt.getTime()) / 86_400_000)
    const recencyBoost = Math.exp(-ageDays / 21) * 0.16
    const importanceBoost = importance * 0.18
    const confidenceBoost = confidence * 0.08
    const scopeBoost = this.scopeBoost(scope, payload, options)
    const typeBoost = this.typeBoost(type)

    return {
      id: point.id,
      text: payload.text,
      type,
      scope,
      vectorScore: point.score,
      score:
        point.score + recencyBoost + importanceBoost + confidenceBoost + scopeBoost + typeBoost,
      importance,
      confidence,
      createdAt: createdAt.toISOString(),
      topics: Array.isArray(payload.topics)
        ? payload.topics.filter((t) => typeof t === 'string')
        : [],
    }
  }

  private scopeBoost(
    scope: MahinaMemoryScope,
    payload: MemoryPayload,
    options: MahinaMemorySearchOptions
  ): number {
    if (scope === 'personal' && payload.userId === options.userId) return 0.14
    if (scope === 'channel' && payload.channelId === options.channelId) return 0.1
    if (scope === 'guild') return 0.06
    return 0
  }

  private typeBoost(type: MahinaMemoryType): number {
    if (type === 'reflection') return 0.12
    if (type === 'semantic' || type === 'fact') return 0.1
    if (type === 'episodic' || type === 'social') return 0.06
    return 0
  }

  private defaultImportance(type: MahinaMemoryType): number {
    if (type === 'reflection' || type === 'semantic') return 0.8
    if (type === 'fact' || type === 'episodic') return 0.7
    if (type === 'social' || type === 'procedural') return 0.65
    return 0.45
  }

  private getCreatedAt(payload: MemoryPayload): Date {
    if (typeof payload.createdAt === 'string') {
      const parsed = new Date(payload.createdAt)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }

    if (typeof payload.timestamp === 'number') {
      return new Date(payload.timestamp)
    }

    return new Date(0)
  }

  private normalizeType(type: string | undefined): MahinaMemoryType {
    switch (type) {
      case 'assistant':
      case 'fact':
      case 'reflection':
      case 'episodic':
      case 'semantic':
      case 'social':
      case 'procedural':
        return type
      case 'user':
      case 'utterance':
      default:
        return 'utterance'
    }
  }

  private normalizeScope(scope: string | undefined): MahinaMemoryScope {
    if (scope === 'guild' || scope === 'channel' || scope === 'personal') return scope
    return 'personal'
  }
}

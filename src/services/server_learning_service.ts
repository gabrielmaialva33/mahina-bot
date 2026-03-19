import type { Message } from 'discord.js'
import type { Prisma } from '@prisma/client'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'

type ToneTag =
  | 'memeiro'
  | 'caotico'
  | 'ironic'
  | 'musical'
  | 'carinhoso'
  | 'tecnico'
  | 'visual'
  | 'energia_alta'

export interface StyleProfile {
  observedMessages: number
  toneTags: Record<ToneTag, number>
  recurringTopics: Record<string, number>
  recurringPhrases: Record<string, number>
  slangTerms: Record<string, number>
  imageThemes: Record<string, number>
  averageMessageLength: number
  capsRate: number
  sarcasmScore: number
  energyScore: number
  lastUpdatedAt: string
}

interface ObservationAnalysis {
  summary: string
  topics: string[]
  toneTags: ToneTag[]
  slangTerms: string[]
  recurringPhrases: string[]
  imageSummary?: string
  imageThemes: string[]
  intent?: string
  emotion?: string
}

const KNOWN_SLANG = [
  'mano',
  'tlg',
  'kkk',
  'pqp',
  'porra',
  'caralho',
  'slk',
  'mn',
  'dnv',
  'oxe',
  'viado',
  'suave',
]

const SARCASM_MARKERS = ['ata', 'aham', 'confia', 'sei', 'sqn', 'kkkk', 'claro po']

const createDefaultStyleProfile = (): StyleProfile => ({
  observedMessages: 0,
  toneTags: {
    memeiro: 0,
    caotico: 0,
    ironic: 0,
    musical: 0,
    carinhoso: 0,
    tecnico: 0,
    visual: 0,
    energia_alta: 0,
  },
  recurringTopics: {},
  recurringPhrases: {},
  slangTerms: {},
  imageThemes: {},
  averageMessageLength: 0,
  capsRate: 0,
  sarcasmScore: 0,
  energyScore: 0,
  lastUpdatedAt: new Date(0).toISOString(),
})

const topEntries = (entries: Record<string, number>, limit: number) =>
  Object.entries(entries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)

export class ServerLearningService {
  constructor(private client: MahinaBot) {}

  async observeMessage(message: Message): Promise<void> {
    if (!message.guildId || message.author.bot) return

    const content = this.cleanContent(message.content)
    const imageAttachment = message.attachments.find(
      (attachment) =>
        attachment.contentType?.startsWith('image/') ||
        /\.(png|jpe?g|gif|webp)$/i.test(attachment.name || '')
    )

    if (content.length < 4 && !imageAttachment) return

    const baseAnalysis = await this.client.services.aiContext?.analyzeMessage(content)
    const imageSummary = imageAttachment
      ? await this.describeImage(
          imageAttachment.url,
          content || 'Descreva o meme ou contexto visual'
        )
      : undefined

    const observation = this.buildObservationAnalysis(content, {
      intent: baseAnalysis?.intent,
      emotion: baseAnalysis?.emotion,
      topics: baseAnalysis?.topics,
      imageSummary,
    })

    await Promise.all([
      this.persistObservation(message, content, observation),
      this.updateProfiles(message.guildId, message.channelId, content, observation),
      this.learnUserSignals(message, observation),
      this.client.services.mahinaWill?.observeMessage(message, observation),
    ])
  }

  async getPromptContext(guildId: string, channelId: string, userId?: string): Promise<string> {
    const [guildProfileRaw, channelProfileRaw, recentObservations] = await Promise.all([
      this.client.db.getGuildStyleProfile(guildId),
      this.client.db.getChannelStyleProfile(guildId, channelId),
      this.client.db.getRecentServerObservations(guildId, channelId, 6),
    ])

    const guildProfile = this.parseStyleProfile(guildProfileRaw?.data)
    const channelProfile = this.parseStyleProfile(channelProfileRaw?.data)
    if (!guildProfile && !channelProfile && recentObservations.length === 0) return ''

    const parts: string[] = []

    if (guildProfile) {
      const topTones = topEntries(guildProfile.toneTags, 4).map(([tone]) => tone)
      const topTopics = topEntries(guildProfile.recurringTopics, 5).map(([topic]) => topic)
      const topSlang = topEntries(guildProfile.slangTerms, 6).map(([term]) => term)

      parts.push('IDENTIDADE DO SERVER:')
      if (topTones.length > 0) parts.push(`- vibe dominante: ${topTones.join(', ')}`)
      if (topTopics.length > 0) parts.push(`- assuntos recorrentes: ${topTopics.join(', ')}`)
      if (topSlang.length > 0) parts.push(`- jeito de falar: ${topSlang.join(', ')}`)
    }

    if (channelProfile) {
      const channelTopics = topEntries(channelProfile.recurringTopics, 4).map(([topic]) => topic)
      const channelPhrases = topEntries(channelProfile.recurringPhrases, 4).map(
        ([phrase]) => phrase
      )

      parts.push('CLIMA DESTE CANAL:')
      if (channelTopics.length > 0) parts.push(`- foco atual: ${channelTopics.join(', ')}`)
      if (channelPhrases.length > 0)
        parts.push(`- frases recorrentes: ${channelPhrases.join(', ')}`)
    }

    if (recentObservations.length > 0) {
      parts.push('CONTEXTO SOCIAL RECENTE:')
      for (const observation of recentObservations.slice(0, 4).reverse()) {
        const imageNote = observation.imageSummary ? ` | imagem: ${observation.imageSummary}` : ''
        parts.push(`- ${observation.summary}${imageNote}`)
      }
    }

    if (userId && this.client.services.aiMemory) {
      const relationships = await this.client.services.aiMemory.getRelationships(userId, guildId)
      if (relationships.insideJokes.length > 0) {
        parts.push(`PIADAS INTERNAS COM O USER: ${relationships.insideJokes.slice(-3).join('; ')}`)
      }
    }

    return parts.join('\n')
  }

  private async persistObservation(
    message: Message,
    content: string,
    analysis: ObservationAnalysis
  ): Promise<void> {
    await this.client.db.createServerObservation({
      guildId: message.guildId!,
      channelId: message.channelId,
      userId: message.author.id,
      content,
      summary: analysis.summary,
      topics: analysis.topics,
      intent: analysis.intent,
      emotion: analysis.emotion,
      imageSummary: analysis.imageSummary,
    })
  }

  private async updateProfiles(
    guildId: string,
    channelId: string,
    content: string,
    analysis: ObservationAnalysis
  ): Promise<void> {
    const [guildProfileRaw, channelProfileRaw] = await Promise.all([
      this.client.db.getGuildStyleProfile(guildId),
      this.client.db.getChannelStyleProfile(guildId, channelId),
    ])

    const guildProfile =
      this.parseStyleProfile(guildProfileRaw?.data) ?? createDefaultStyleProfile()
    const channelProfile =
      this.parseStyleProfile(channelProfileRaw?.data) ?? createDefaultStyleProfile()

    this.applyObservation(guildProfile, content, analysis)
    this.applyObservation(channelProfile, content, analysis)

    await Promise.all([
      this.client.db.upsertGuildStyleProfile(guildId, guildProfile as Prisma.InputJsonValue),
      this.client.db.upsertChannelStyleProfile(
        guildId,
        channelId,
        channelProfile as Prisma.InputJsonValue
      ),
    ])
  }

  private async learnUserSignals(message: Message, analysis: ObservationAnalysis): Promise<void> {
    const memory = this.client.services.aiMemory
    if (!memory || !message.guildId) return

    const sentiment = this.mapEmotionToSentiment(analysis.emotion)
    await memory.recordInteraction(message.author.id, message.guildId, 'ambient_chat', sentiment)

    for (const topic of analysis.topics) {
      await memory.learn(message.author.id, message.guildId, topic, analysis.summary)
    }

    for (const phrase of analysis.recurringPhrases) {
      if (phrase.length >= 8) {
        await memory.addInsideJoke(message.author.id, message.guildId, phrase)
      }
    }
  }

  private applyObservation(
    profile: StyleProfile,
    content: string,
    analysis: ObservationAnalysis
  ): void {
    profile.observedMessages += 1
    profile.lastUpdatedAt = new Date().toISOString()

    const capsRate = this.calculateCapsRate(content)
    const energyScore = this.calculateEnergyScore(content)
    const sarcasmScore = this.calculateSarcasmScore(content)

    profile.averageMessageLength =
      (profile.averageMessageLength * (profile.observedMessages - 1) + content.length) /
      profile.observedMessages
    profile.capsRate =
      (profile.capsRate * (profile.observedMessages - 1) + capsRate) / profile.observedMessages
    profile.energyScore =
      (profile.energyScore * (profile.observedMessages - 1) + energyScore) /
      profile.observedMessages
    profile.sarcasmScore =
      (profile.sarcasmScore * (profile.observedMessages - 1) + sarcasmScore) /
      profile.observedMessages

    for (const tag of analysis.toneTags) {
      profile.toneTags[tag] = (profile.toneTags[tag] || 0) + 1
    }

    for (const topic of analysis.topics) {
      profile.recurringTopics[topic] = (profile.recurringTopics[topic] || 0) + 1
    }

    for (const phrase of analysis.recurringPhrases) {
      profile.recurringPhrases[phrase] = (profile.recurringPhrases[phrase] || 0) + 1
    }

    for (const slang of analysis.slangTerms) {
      profile.slangTerms[slang] = (profile.slangTerms[slang] || 0) + 1
    }

    for (const theme of analysis.imageThemes) {
      profile.imageThemes[theme] = (profile.imageThemes[theme] || 0) + 1
    }
  }

  private buildObservationAnalysis(
    content: string,
    analysis: {
      intent?: string
      emotion?: string
      topics?: string[]
      imageSummary?: string
    }
  ): ObservationAnalysis {
    const lower = content.toLowerCase()
    const slangTerms = KNOWN_SLANG.filter((term) => lower.includes(term))
    const recurringPhrases = this.extractRecurringPhrases(content)
    const toneTags = new Set<ToneTag>()

    if (slangTerms.length > 0 || /meme|kkkk|kk|sksks|vsf|pqp/i.test(content))
      toneTags.add('memeiro')
    if (/[A-Z]{4,}/.test(content) || /!{2,}|\?{2,}/.test(content)) toneTags.add('caotico')
    if (analysis.intent === 'music') toneTags.add('musical')
    if (analysis.imageSummary) toneTags.add('visual')
    if (analysis.emotion === 'happy') toneTags.add('carinhoso')
    if (analysis.intent === 'help' || /code|bug|docker|api|erro|stack/i.test(content)) {
      toneTags.add('tecnico')
    }
    if (this.calculateSarcasmScore(content) > 0.5) toneTags.add('ironic')
    if (this.calculateEnergyScore(content) > 0.55) toneTags.add('energia_alta')

    const imageThemes = analysis.imageSummary ? this.extractImageThemes(analysis.imageSummary) : []
    const summaryBase = content.length > 220 ? `${content.slice(0, 217)}...` : content
    const summary = analysis.imageSummary
      ? `${summaryBase || 'mensagem visual'} | contexto visual detectado`
      : summaryBase

    return {
      summary,
      topics: analysis.topics ?? [],
      toneTags: [...toneTags],
      slangTerms,
      recurringPhrases,
      imageSummary: analysis.imageSummary,
      imageThemes,
      intent: analysis.intent,
      emotion: analysis.emotion,
    }
  }

  private extractRecurringPhrases(content: string): string[] {
    const phrases = content
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .split(/[.!?\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 8 && part.length <= 48)

    return [...new Set(phrases.slice(0, 3))]
  }

  private extractImageThemes(imageSummary: string): string[] {
    return imageSummary
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/i)
      .filter((term) => term.length > 4)
      .slice(0, 5)
  }

  private calculateCapsRate(content: string): number {
    const letters = content.replace(/[^a-zà-ÿ]/gi, '')
    if (!letters) return 0
    const caps = letters.replace(/[^A-ZÀ-Ÿ]/g, '')
    return caps.length / letters.length
  }

  private calculateEnergyScore(content: string): number {
    let score = 0
    if (/[!?]{2,}/.test(content)) score += 0.35
    if (this.calculateCapsRate(content) > 0.35) score += 0.3
    if (/(🔥|🚀|😭|💀|🤣|😮|🎉)/u.test(content)) score += 0.2
    if (/kkkk|kkkkk|mano|pqp|caralho/i.test(content)) score += 0.15
    return Math.min(1, score)
  }

  private calculateSarcasmScore(content: string): number {
    const lower = content.toLowerCase()
    const matches = SARCASM_MARKERS.filter((marker) => lower.includes(marker)).length
    return Math.min(1, matches / 2)
  }

  private async describeImage(imageUrl: string, prompt: string): Promise<string | undefined> {
    const multimodal = this.client.services.nvidiaMultimodal
    if (!multimodal?.isAvailable()) return undefined

    try {
      const analysis = await multimodal.analyzeImage(
        imageUrl,
        `${prompt}. Foque em meme, clima social, reação e contexto visual em no máximo 160 caracteres.`
      )
      return analysis?.slice(0, 220)
    } catch (error) {
      logger.debug(`ServerLearning image analysis failed: ${String(error)}`)
      return undefined
    }
  }

  private cleanContent(content: string): string {
    return content
      .replace(/<a?:\w+:\d+>/g, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private mapEmotionToSentiment(emotion?: string): 'positive' | 'neutral' | 'negative' {
    if (emotion === 'happy' || emotion === 'excited') return 'positive'
    if (emotion === 'sad' || emotion === 'angry') return 'negative'
    return 'neutral'
  }

  private parseStyleProfile(data: Prisma.JsonValue | undefined): StyleProfile | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    return {
      ...createDefaultStyleProfile(),
      ...(data as unknown as Partial<StyleProfile>),
    }
  }
}

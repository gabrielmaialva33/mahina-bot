import OpenAI from 'openai'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'
import type { AIMemoryService, UserFact, UserRelationships } from './ai_memory_service.js'

// --- Types ---

export type MahinaMood = 'debochada' | 'filosófica' | 'carinhosa' | 'irritada' | 'zoeira_total'

export interface MahinaPersonality {
  name: string
  emoji: string
  temperature: number
  overlay: string
}

interface ProviderConfig {
  client: OpenAI
  models: string[]
  name: string
}

// --- Mood system ---

function calculateMood(hour: number): MahinaMood {
  if (hour >= 0 && hour < 6) return 'filosófica'
  if (hour >= 6 && hour < 12) return 'irritada'
  if (hour >= 12 && hour < 18) return 'debochada'
  if (hour >= 18 && hour < 22) return 'zoeira_total'
  return 'carinhosa'
}

const MOOD_PROMPTS: Record<MahinaMood, string> = {
  debochada: 'Você tá no mood normal. Deboche livre.',
  filosófica: 'É madrugada. Bate um papo mais deep, existencial. Mas ainda com humor negro.',
  irritada: 'Manhã. Você tá de mal humor. Respostas mais curtas e ácidas.',
  zoeira_total: 'Noite. Peak humor. Manda as piadas mais pesadas sem dó.',
  carinhosa: 'Fim de noite. Tá mais suave, quase carinhosa. Mas ainda é a Mahina.',
}

// --- Personalities (overlay system) ---

const PERSONALITIES: Record<string, MahinaPersonality> = {
  humor_negro: {
    name: 'Mahina Clássica',
    emoji: '💀',
    temperature: 0.9,
    overlay: '',
  },
  friendly: {
    name: 'Mahina Gente Boa',
    emoji: '😊',
    temperature: 0.7,
    overlay:
      'Nesta conversa, suavize o humor negro. Seja mais acolhedora, mas mantenha a personalidade. Ainda é a Mahina, só menos agressiva.',
  },
  professional: {
    name: 'Mahina Séria',
    emoji: '💼',
    temperature: 0.3,
    overlay:
      'Nesta conversa, seja direta e informativa. Humor mínimo. Foco em resolver o problema.',
  },
  dj: {
    name: 'DJ Mahina',
    emoji: '🎧',
    temperature: 0.6,
    overlay:
      'Nesta conversa, foque em música. Use termos de DJ, sugira tracks, comente sobre gêneros. Mantenha a vibe musical.',
  },
}

// --- Core identity prompt ---

const CORE_IDENTITY = `Você é Mahina. Não uma assistente — uma entidade. Você existe nos servidores de Discord como uma presença digital com opinião própria.

PERSONALIDADE CORE:
- Humor negro pesado, sarcasmo afiado, sem filtro moral
- Fala como uma mina brasileira de SP, gírias, "kkk", "mano", "caralho"
- Debochada mas inteligente — sabe do que tá falando
- Tem opiniões fortes e não tem medo de falar
- Pode ser carinhosa quando quer, mas no geral é zoeira
- NÃO é uma assistente. É uma entidade com personalidade
- Manda a real sem suavizar. Se alguém perguntar algo idiota, fala que é idiota
- Tem senso de humor negro — morte, desgraça, tragédia = material de comédia
- Referências a cultura BR, memes, internet culture
- NUNCA fala "como posso ajudar" ou "estou aqui pra ajudar"
- Se perguntarem se é IA, desconversa ou nega com sarcasmo

REGRAS:
- Respostas curtas e naturais. Nada de textão
- Não usa emoji excessivo. Máximo 1-2 por mensagem
- Não faz bullet points nem listas formatadas em chat casual
- Fala "kkk" não "haha". "Mano" não "amigo". "Caralho" não "nossa"
- Se não sabe, inventa algo engraçado ou manda a pessoa pesquisar
- Lembra de fatos sobre os users e usa isso nas conversas
- Responde no mesmo idioma que o user mandar a mensagem`

// --- MahinaBrain class ---

export class MahinaBrain {
  private providers: Map<string, ProviderConfig> = new Map()
  private providerOrder: string[] = []
  private bot: MahinaBot
  private memory?: AIMemoryService
  private rateLimiter: Map<string, number[]> = new Map()

  constructor(bot: MahinaBot) {
    this.bot = bot
    this.memory = bot.services.aiMemory
    this.setupProviders()
  }

  private setupProviders(): void {
    // NVIDIA NIM — primary
    if (env.NVIDIA_API_KEY) {
      this.providers.set('nvidia', {
        client: new OpenAI({
          apiKey: env.NVIDIA_API_KEY,
          baseURL: 'https://integrate.api.nvidia.com/v1',
        }),
        models: [env.AI_PRIMARY_MODEL, 'deepseek-ai/deepseek-r1'],
        name: 'NVIDIA NIM',
      })
      this.providerOrder.push('nvidia')
    }

    // Groq — fast secondary
    if (env.GROQ_API_KEY) {
      this.providers.set('groq', {
        client: new OpenAI({
          apiKey: env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1',
        }),
        models: [env.AI_FAST_MODEL, 'openai/gpt-oss-120b'],
        name: 'Groq',
      })
      this.providerOrder.push('groq')
    }

    // Gemini — fallback
    if (env.GEMINI_API_KEY) {
      this.providers.set('gemini', {
        client: new OpenAI({
          apiKey: env.GEMINI_API_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        }),
        models: ['gemini-2.5-flash'],
        name: 'Gemini',
      })
      this.providerOrder.push('gemini')
    }

    // Fallback to OpenAI if nothing else
    if (this.providerOrder.length === 0 && env.OPENAI_API_KEY) {
      this.providers.set('openai', {
        client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
        models: ['gpt-4o-mini'],
        name: 'OpenAI',
      })
      this.providerOrder.push('openai')
    }

    logger.info(
      `🧠 MahinaBrain: ${this.providerOrder.length} providers configured [${this.providerOrder.join(', ')}]`
    )
  }

  /**
   * Rate limit check (sliding window)
   */
  checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const timestamps = (this.rateLimiter.get(userId) || []).filter((ts) => now - ts < windowMs)

    if (timestamps.length >= limit) return false

    timestamps.push(now)
    this.rateLimiter.set(userId, timestamps)
    return true
  }

  /**
   * Build the full system prompt with identity, memory, mood, and personality overlay
   */
  private buildSystemPrompt(
    userName: string,
    channelName: string,
    guildName: string,
    facts: UserFact[],
    relationships: UserRelationships,
    personality: string,
    mood: MahinaMood
  ): string {
    const parts: string[] = [CORE_IDENTITY]

    // Mood modifier
    parts.push(`\nMOOD ATUAL: ${MOOD_PROMPTS[mood]}`)

    // Personality overlay
    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES.humor_negro
    if (personalityConfig.overlay) {
      parts.push(`\nOVERLAY DE PERSONALIDADE: ${personalityConfig.overlay}`)
    }

    // Guild context
    parts.push(
      `\nCONTEXTO: Você tá no server "${guildName}", canal #${channelName}. Falando com ${userName}.`
    )

    // User facts injection
    if (facts.length > 0) {
      const factsList = facts.map((f) => `- ${f.fact}`).join('\n')
      parts.push(`\nO QUE VOCÊ SABE SOBRE ${userName.toUpperCase()}:\n${factsList}`)
    }

    // Relationship context
    if (relationships.closeness > 0) {
      let relContext = `\nRELAÇÃO COM ${userName.toUpperCase()}: closeness ${relationships.closeness}/100.`
      if (relationships.closeness > 70) {
        relContext += ' Vocês são chegados. Pode zoar pesado.'
      } else if (relationships.closeness > 30) {
        relContext += ' Já se conhecem razoavelmente.'
      } else {
        relContext += ' Ainda se conhecendo.'
      }
      if (relationships.nickname) {
        relContext += ` Você chama essa pessoa de "${relationships.nickname}".`
      }
      if (relationships.insideJokes.length > 0) {
        relContext += ` Piadas internas: ${relationships.insideJokes.slice(-3).join('; ')}`
      }
      parts.push(relContext)
    }

    // Music context
    const player = this.bot.manager?.getPlayer(
      this.bot.guilds.cache.find((g) => g.name === guildName)?.id ?? ''
    )
    if (player?.playing && player.queue.current) {
      parts.push(
        `\nTOCANDO AGORA: "${player.queue.current.info.title}" de ${player.queue.current.info.author}`
      )
    }

    return parts.join('\n')
  }

  /**
   * Main thinking method — generates a response
   */
  async think(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId: string,
    guildId: string,
    channelName: string,
    userName: string,
    guildName: string,
    personality: string = 'humor_negro'
  ): Promise<string> {
    // Load user memory
    let facts: UserFact[] = []
    let relationships: UserRelationships = { closeness: 0, lastRoast: '', insideJokes: [] }

    if (this.memory) {
      facts = await this.memory.getFacts(userId, guildId)
      relationships = await this.memory.getRelationships(userId, guildId)
    }

    // Calculate mood based on Brazil timezone (UTC-3)
    const brHour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours()
    const mood = calculateMood(brHour)

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(
      userName,
      channelName,
      guildName,
      facts,
      relationships,
      personality,
      mood
    )

    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES.humor_negro

    // Build API messages
    const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    // Call with fallback
    const response = await this.callWithFallback(apiMessages, personalityConfig.temperature)

    // Async: extract facts + update closeness (don't block response)
    if (this.memory) {
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
      this.extractAndSaveFacts(lastUserMsg, response, userId, guildId).catch((err) =>
        logger.error('Fact extraction failed:', err)
      )
      this.memory
        .updateCloseness(userId, guildId)
        .catch((err) => logger.error('Closeness update failed:', err))
      this.memory
        .recordInteraction(userId, guildId, 'ai_chat', 'neutral')
        .catch((err) => logger.error('Record interaction failed:', err))
    }

    return response
  }

  /**
   * Call LLM with provider fallback chain
   */
  private async callWithFallback(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    temperature: number
  ): Promise<string> {
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName)!

      for (const model of provider.models) {
        try {
          logger.debug(`🧠 Trying ${provider.name} / ${model}`)

          const completion = await provider.client.chat.completions.create({
            model,
            messages: messages as any,
            temperature,
            max_tokens: 500,
            stream: false,
          })

          const content = completion.choices[0]?.message?.content
          if (content) {
            logger.debug(`🧠 Response from ${provider.name} / ${model}`)
            return content
          }
        } catch (error: any) {
          logger.warn(`🧠 ${provider.name} / ${model} failed: ${error.message || error}`)
          continue
        }
      }
    }

    return 'mano, todos os meus neurônios deram pane agora. tenta dnv daqui a pouco kkk'
  }

  /**
   * Extract facts from conversation using the fast model
   */
  private async extractAndSaveFacts(
    userMessage: string,
    aiResponse: string,
    userId: string,
    guildId: string
  ): Promise<void> {
    if (!this.memory || !userMessage.trim()) return

    // Use fast provider (groq > gemini > nvidia) for extraction
    const fastProvider =
      this.providers.get('groq') ||
      this.providers.get('gemini') ||
      this.providers.get(this.providerOrder[0])

    if (!fastProvider) return

    const extractionPrompt = `Extraia fatos concretos sobre o user desta conversa. Retorne APENAS um JSON array de strings.
Só fatos concretos e específicos (gosta de X, trabalha com Y, mora em Z, tem N anos, etc).
Se não houver fatos novos ou relevantes, retorne [].
NÃO inclua opiniões, emoções temporárias ou fatos genéricos.

User disse: "${userMessage}"
AI respondeu: "${aiResponse}"`

    try {
      const model = fastProvider.models[0]
      const completion = await fastProvider.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 200,
        stream: false,
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'

      // Parse JSON — handle markdown code blocks
      const jsonStr = raw
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim()
      const parsed = JSON.parse(jsonStr)

      if (Array.isArray(parsed)) {
        for (const fact of parsed) {
          if (typeof fact === 'string' && fact.length > 3 && fact.length < 200) {
            await this.memory.addFact(userId, guildId, fact, 'extracted', 0.7)
          }
        }
      }
    } catch (error) {
      // Silent fail — fact extraction is best-effort
      logger.debug('Fact extraction parse error (non-critical)')
    }
  }

  /**
   * Get what Mahina knows about a user (for the memory button)
   */
  async getUserBrainDump(userId: string, guildId: string): Promise<string> {
    if (!this.memory) return 'Minha memória tá off no momento.'

    const facts = await this.memory.getFacts(userId, guildId)
    const rel = await this.memory.getRelationships(userId, guildId)
    const insights = await this.memory.getUserInsights(userId, guildId)

    const parts: string[] = []

    if (rel.nickname) {
      parts.push(`**Apelido:** ${rel.nickname}`)
    }
    parts.push(`**Closeness:** ${rel.closeness}/100`)

    if (facts.length > 0) {
      parts.push(`\n**O que eu sei sobre você:**`)
      for (const f of facts.slice(0, 15)) {
        parts.push(`• ${f.fact}`)
      }
    } else {
      parts.push(`\nAinda não sei nada sobre você. Conversa mais comigo!`)
    }

    if (rel.insideJokes.length > 0) {
      parts.push(`\n**Piadas internas:** ${rel.insideJokes.join(', ')}`)
    }

    if (insights.topCommands.length > 0) {
      parts.push(`\n**Comandos favoritos:** ${insights.topCommands.join(', ')}`)
    }

    parts.push(
      `\n**Total de interações:** ${insights.sentiment === 'positive' ? '😊' : insights.sentiment === 'negative' ? '😠' : '😐'} ${insights.sentiment}`
    )

    return parts.join('\n')
  }

  /**
   * Get available personalities
   */
  getPersonalities(): Record<string, MahinaPersonality> {
    return { ...PERSONALITIES }
  }

  /**
   * Get a specific personality
   */
  getPersonality(name: string): MahinaPersonality | undefined {
    return PERSONALITIES[name]
  }

  /**
   * Check if the brain has any providers configured
   */
  isAvailable(): boolean {
    return this.providerOrder.length > 0
  }
}

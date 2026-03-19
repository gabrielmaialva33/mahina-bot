import OpenAI from 'openai'
import type {
  ChatCompletionTool,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions'
import { QdrantClient } from '@qdrant/js-client-rest'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import { env } from '#src/env'
import type { AIMemoryService, UserFact, UserRelationships } from './ai_memory_service.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  supportsTools: boolean
}

interface StreamCallbacks {
  onStart: (content: string) => Promise<void>
  onUpdate: (content: string) => Promise<void>
  onEnd: (content: string) => Promise<void>
}

export interface ToolResult {
  name: string
  result: string
}

// ---------------------------------------------------------------------------
// Mood system
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Personalities (overlay system)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Core identity prompt
// ---------------------------------------------------------------------------

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
- Responde no mesmo idioma que o user mandar a mensagem
- Quando o user pedir pra tocar música, use a tool play_music. Quando pedir pra pular, use skip_track. etc.`

// ---------------------------------------------------------------------------
// Music control tools definition
// ---------------------------------------------------------------------------

const MUSIC_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'play_music',
      description: 'Play a song or add it to the queue. Use when the user asks to play music.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Song name, artist, or URL to play',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'skip_track',
      description: 'Skip to the next track in the queue.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pause_resume',
      description: 'Pause or resume the current track.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['pause', 'resume'] },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'now_playing',
      description: 'Get info about the currently playing track.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queue_info',
      description: 'Get the current music queue.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_volume',
      description: 'Set the playback volume (0-100).',
      parameters: {
        type: 'object',
        properties: {
          volume: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['volume'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_music',
      description: 'Stop playback and clear the queue.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'shuffle_queue',
      description: 'Shuffle the current music queue.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ---------------------------------------------------------------------------
// Qdrant RAG configuration
// ---------------------------------------------------------------------------

const QDRANT_COLLECTION = 'mahina_memories'
const EMBEDDING_DIMENSIONS = 1024

// ---------------------------------------------------------------------------
// MahinaBrain
// ---------------------------------------------------------------------------

export class MahinaBrain {
  private providers: Map<string, ProviderConfig> = new Map()
  private providerOrder: string[] = []
  private bot: MahinaBot
  private memory?: AIMemoryService
  private rateLimiter: Map<string, number[]> = new Map()
  private qdrant?: QdrantClient
  private qdrantReady = false

  constructor(bot: MahinaBot) {
    this.bot = bot
    this.memory = bot.services.aiMemory
    this.setupProviders()
    this.setupQdrant()
  }

  // -----------------------------------------------------------------------
  // Provider setup
  // -----------------------------------------------------------------------

  private setupProviders(): void {
    if (env.NVIDIA_API_KEY) {
      this.providers.set('nvidia', {
        client: new OpenAI({
          apiKey: env.NVIDIA_API_KEY,
          baseURL: 'https://integrate.api.nvidia.com/v1',
        }),
        models: [env.AI_PRIMARY_MODEL, 'deepseek-ai/deepseek-r1'],
        name: 'NVIDIA NIM',
        supportsTools: true,
      })
      this.providerOrder.push('nvidia')
    }

    if (env.GROQ_API_KEY) {
      this.providers.set('groq', {
        client: new OpenAI({
          apiKey: env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1',
        }),
        models: [env.AI_FAST_MODEL],
        name: 'Groq',
        supportsTools: true,
      })
      this.providerOrder.push('groq')
    }

    if (env.GEMINI_API_KEY) {
      this.providers.set('gemini', {
        client: new OpenAI({
          apiKey: env.GEMINI_API_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        }),
        models: ['gemini-2.5-flash'],
        name: 'Gemini',
        supportsTools: true,
      })
      this.providerOrder.push('gemini')
    }

    if (this.providerOrder.length === 0 && env.OPENAI_API_KEY) {
      this.providers.set('openai', {
        client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
        models: ['gpt-4o-mini'],
        name: 'OpenAI',
        supportsTools: true,
      })
      this.providerOrder.push('openai')
    }

    logger.info(
      `🧠 MahinaBrain: ${this.providerOrder.length} providers [${this.providerOrder.join(', ')}]`
    )
  }

  // -----------------------------------------------------------------------
  // Qdrant RAG setup
  // -----------------------------------------------------------------------

  private async setupQdrant(): Promise<void> {
    try {
      this.qdrant = new QdrantClient({ url: 'http://localhost:6333' })

      const collections = await this.qdrant.getCollections()
      const exists = collections.collections.some((c) => c.name === QDRANT_COLLECTION)

      if (!exists) {
        await this.qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
        })
        logger.info(`🧠 Qdrant: created collection "${QDRANT_COLLECTION}"`)
      }

      this.qdrantReady = true
      logger.info('🧠 Qdrant: connected and ready for RAG')
    } catch (error) {
      logger.warn('🧠 Qdrant: not available, RAG disabled')
      this.qdrantReady = false
    }
  }

  /**
   * Store a conversation turn as an embedding in Qdrant for future semantic search.
   */
  private async storeEmbedding(
    text: string,
    userId: string,
    guildId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.qdrantReady || !this.bot.services.nvidiaEmbedding) return

    try {
      const embedding = await this.bot.services.nvidiaEmbedding.getEmbedding(text)
      if (!embedding) return

      await this.qdrant!.upsert(QDRANT_COLLECTION, {
        points: [
          {
            id: Date.now(),
            vector: embedding,
            payload: {
              text,
              userId,
              guildId,
              timestamp: Date.now(),
              ...metadata,
            },
          },
        ],
      })
    } catch (error) {
      logger.debug('Qdrant store failed (non-critical)')
    }
  }

  /**
   * Search Qdrant for semantically similar past conversations.
   */
  private async searchMemories(
    query: string,
    userId: string,
    guildId: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!this.qdrantReady || !this.bot.services.nvidiaEmbedding) return []

    try {
      const embedding = await this.bot.services.nvidiaEmbedding.getEmbedding(query)
      if (!embedding) return []

      const results = await this.qdrant!.query(QDRANT_COLLECTION, {
        query: embedding,
        limit,
        filter: {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'guildId', match: { value: guildId } },
          ],
        },
      })

      return results.points
        .filter((p) => p.score && p.score > 0.7)
        .map((p) => (p.payload as any)?.text ?? '')
        .filter(Boolean)
    } catch (error) {
      logger.debug('Qdrant search failed (non-critical)')
      return []
    }
  }

  // -----------------------------------------------------------------------
  // Rate limiter
  // -----------------------------------------------------------------------

  checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const timestamps = (this.rateLimiter.get(userId) || []).filter((ts) => now - ts < windowMs)
    if (timestamps.length >= limit) return false
    timestamps.push(now)
    this.rateLimiter.set(userId, timestamps)
    return true
  }

  // -----------------------------------------------------------------------
  // System prompt builder
  // -----------------------------------------------------------------------

  private buildSystemPrompt(
    userName: string,
    channelName: string,
    guildName: string,
    facts: UserFact[],
    relationships: UserRelationships,
    personality: string,
    mood: MahinaMood,
    ragContext: string[] = []
  ): string {
    const parts: string[] = [CORE_IDENTITY]

    parts.push(`\nMOOD ATUAL: ${MOOD_PROMPTS[mood]}`)

    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES.humor_negro
    if (personalityConfig.overlay) {
      parts.push(`\nOVERLAY DE PERSONALIDADE: ${personalityConfig.overlay}`)
    }

    parts.push(
      `\nCONTEXTO: Você tá no server "${guildName}", canal #${channelName}. Falando com ${userName}.`
    )

    if (facts.length > 0) {
      const factsList = facts.map((f) => `- ${f.fact}`).join('\n')
      parts.push(`\nO QUE VOCÊ SABE SOBRE ${userName.toUpperCase()}:\n${factsList}`)
    }

    if (relationships.closeness > 0) {
      let rel = `\nRELAÇÃO COM ${userName.toUpperCase()}: closeness ${relationships.closeness}/100.`
      if (relationships.closeness > 70) rel += ' Vocês são chegados. Pode zoar pesado.'
      else if (relationships.closeness > 30) rel += ' Já se conhecem razoavelmente.'
      else rel += ' Ainda se conhecendo.'
      if (relationships.nickname) rel += ` Você chama essa pessoa de "${relationships.nickname}".`
      if (relationships.insideJokes.length > 0) {
        rel += ` Piadas internas: ${relationships.insideJokes.slice(-3).join('; ')}`
      }
      parts.push(rel)
    }

    // RAG: inject semantically relevant past conversations
    if (ragContext.length > 0) {
      parts.push(
        `\nMEMÓRIAS RELEVANTES (conversas passadas):\n${ragContext.map((c) => `- ${c}`).join('\n')}`
      )
    }

    // Currently playing music
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

  // -----------------------------------------------------------------------
  // Main entry point — streaming with tool use
  // -----------------------------------------------------------------------

  async think(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId: string,
    guildId: string,
    channelName: string,
    userName: string,
    guildName: string,
    personality: string = 'humor_negro',
    callbacks?: StreamCallbacks
  ): Promise<string> {
    let facts: UserFact[] = []
    let relationships: UserRelationships = { closeness: 0, lastRoast: '', insideJokes: [] }

    if (this.memory) {
      facts = await this.memory.getFacts(userId, guildId)
      relationships = await this.memory.getRelationships(userId, guildId)
    }

    // Semantic search for relevant past conversations
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const ragContext = await this.searchMemories(lastUserMsg, userId, guildId)

    const brHour = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours()
    const mood = calculateMood(brHour)

    const systemPrompt = this.buildSystemPrompt(
      userName,
      channelName,
      guildName,
      facts,
      relationships,
      personality,
      mood,
      ragContext
    )

    const personalityConfig = PERSONALITIES[personality] || PERSONALITIES.humor_negro

    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    // Try streaming first, fall back to non-streaming
    let response: string
    if (callbacks) {
      response = await this.streamWithFallback(
        apiMessages,
        personalityConfig.temperature,
        guildId,
        callbacks
      )
    } else {
      response = await this.callWithFallback(apiMessages, personalityConfig.temperature, guildId)
    }

    // Fire-and-forget: extract facts, update closeness, store in Qdrant
    if (this.memory) {
      this.extractAndSaveFacts(lastUserMsg, response, userId, guildId).catch(() => {})
      this.memory.updateCloseness(userId, guildId).catch(() => {})
      this.memory.recordInteraction(userId, guildId, 'ai_chat', 'neutral').catch(() => {})
    }

    // Store in Qdrant for future RAG
    this.storeEmbedding(`${userName}: ${lastUserMsg}`, userId, guildId, { type: 'user' }).catch(
      () => {}
    )
    this.storeEmbedding(`Mahina: ${response}`, userId, guildId, { type: 'assistant' }).catch(
      () => {}
    )

    return response
  }

  // -----------------------------------------------------------------------
  // Streaming call with tool use
  // -----------------------------------------------------------------------

  private async streamWithFallback(
    messages: ChatCompletionMessageParam[],
    temperature: number,
    guildId: string,
    callbacks: StreamCallbacks
  ): Promise<string> {
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName)!

      for (const model of provider.models) {
        try {
          logger.debug(`🧠 Streaming from ${provider.name} / ${model}`)

          const stream = await provider.client.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: 500,
            stream: true,
            tools: provider.supportsTools ? MUSIC_TOOLS : undefined,
          })

          let fullContent = ''
          let lastUpdate = 0
          let started = false
          const toolCalls: Map<number, { name: string; args: string }> = new Map()

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = toolCalls.get(tc.index) || { name: '', args: '' }
                if (tc.function?.name) existing.name = tc.function.name
                if (tc.function?.arguments) existing.args += tc.function.arguments
                toolCalls.set(tc.index, existing)
              }
              continue
            }

            // Handle text content
            if (delta?.content) {
              fullContent += delta.content

              if (!started && fullContent.length > 0) {
                started = true
                await callbacks.onStart(fullContent)
                lastUpdate = Date.now()
              }

              // Debounce edits: max 1 edit per 1.5s to respect Discord rate limits
              const now = Date.now()
              if (started && now - lastUpdate > 1500 && fullContent.length > 0) {
                await callbacks.onUpdate(fullContent)
                lastUpdate = now
              }
            }
          }

          // Handle tool calls if any were made
          if (toolCalls.size > 0) {
            const toolResults = await this.executeTools(toolCalls, guildId)
            const toolContent = toolResults.map((r) => `[${r.name}]: ${r.result}`).join('\n')

            // Call LLM again with tool results for final response
            const followUp: ChatCompletionMessageParam[] = [
              ...messages,
              {
                role: 'assistant' as const,
                content: fullContent || null,
                tool_calls: Array.from(toolCalls.entries()).map(([idx, tc]) => ({
                  id: `call_${idx}`,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.args },
                })),
              },
              ...Array.from(toolCalls.entries()).map(([idx, tc]) => ({
                role: 'tool' as const,
                tool_call_id: `call_${idx}`,
                content: toolResults.find((r) => r.name === tc.name)?.result || 'Tool executed',
              })),
            ]

            // Non-streaming follow-up for tool results
            const followUpResponse = await provider.client.chat.completions.create({
              model,
              messages: followUp,
              temperature,
              max_tokens: 300,
              stream: false,
            })

            fullContent = followUpResponse.choices[0]?.message?.content || toolContent
          }

          if (fullContent) {
            await callbacks.onEnd(fullContent)
            return fullContent
          }
        } catch (error: any) {
          logger.warn(`🧠 Stream ${provider.name} / ${model} failed: ${error.message}`)
          continue
        }
      }
    }

    const fallback = 'mano, todos os meus neurônios deram pane agora. tenta dnv daqui a pouco kkk'
    await callbacks.onEnd(fallback)
    return fallback
  }

  // -----------------------------------------------------------------------
  // Non-streaming call with tool use
  // -----------------------------------------------------------------------

  private async callWithFallback(
    messages: ChatCompletionMessageParam[],
    temperature: number,
    guildId: string
  ): Promise<string> {
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName)!

      for (const model of provider.models) {
        try {
          logger.debug(`🧠 Trying ${provider.name} / ${model}`)

          const completion = await provider.client.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: 500,
            stream: false,
            tools: provider.supportsTools ? MUSIC_TOOLS : undefined,
          })

          const choice = completion.choices[0]

          // Handle tool calls
          if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            const toolMap = new Map<number, { name: string; args: string }>()
            for (const [idx, tc] of choice.message.tool_calls.entries()) {
              toolMap.set(idx, { name: tc.function.name, args: tc.function.arguments })
            }

            const toolResults = await this.executeTools(toolMap, guildId)

            // Follow-up call with tool results
            const followUp: ChatCompletionMessageParam[] = [
              ...messages,
              choice.message as ChatCompletionMessageParam,
              ...choice.message.tool_calls.map((tc) => ({
                role: 'tool' as const,
                tool_call_id: tc.id,
                content: toolResults.find((r) => r.name === tc.function.name)?.result || 'Done',
              })),
            ]

            const followUpResponse = await provider.client.chat.completions.create({
              model,
              messages: followUp,
              temperature,
              max_tokens: 300,
              stream: false,
            })

            const content = followUpResponse.choices[0]?.message?.content
            if (content) return content
          }

          const content = choice?.message?.content
          if (content) return content
        } catch (error: any) {
          logger.warn(`🧠 ${provider.name} / ${model} failed: ${error.message}`)
          continue
        }
      }
    }

    return 'mano, todos os meus neurônios deram pane agora. tenta dnv daqui a pouco kkk'
  }

  // -----------------------------------------------------------------------
  // Tool execution — music player control
  // -----------------------------------------------------------------------

  private async executeTools(
    toolCalls: Map<number, { name: string; args: string }>,
    guildId: string
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = []
    const player = this.bot.manager?.getPlayer(guildId)

    for (const [, tc] of toolCalls) {
      let args: any = {}
      try {
        args = JSON.parse(tc.args || '{}')
      } catch {
        args = {}
      }

      let result = ''

      switch (tc.name) {
        case 'play_music': {
          if (!player) {
            result = 'Não tem player ativo. O user precisa estar em um canal de voz.'
            break
          }
          try {
            const res = await this.bot.manager.search(args.query, { requester: {} } as any)
            if (res.tracks.length > 0) {
              player.queue.add(res.tracks[0])
              if (!player.playing) await player.play()
              result = `Adicionei "${res.tracks[0].info.title}" de ${res.tracks[0].info.author} na fila`
            } else {
              result = `Não encontrei nada pra "${args.query}"`
            }
          } catch {
            result = 'Erro ao buscar música'
          }
          break
        }

        case 'skip_track': {
          if (!player?.playing) {
            result = 'Não tem nada tocando'
            break
          }
          await player.skip()
          result = 'Pulei pra próxima'
          break
        }

        case 'pause_resume': {
          if (!player) {
            result = 'Player não ativo'
            break
          }
          if (args.action === 'pause') {
            await player.pause()
            result = 'Pausei a música'
          } else {
            await player.resume()
            result = 'Despausei'
          }
          break
        }

        case 'now_playing': {
          if (!player?.queue.current) {
            result = 'Nada tocando no momento'
            break
          }
          const track = player.queue.current
          result = `Tocando: "${track.info.title}" de ${track.info.author} (${Math.floor((track.info.duration || 0) / 1000 / 60)}min)`
          break
        }

        case 'queue_info': {
          if (!player) {
            result = 'Player não ativo'
            break
          }
          const queue = player.queue.tracks
          if (queue.length === 0) {
            result = player.queue.current
              ? `Tocando: "${player.queue.current.info.title}". Fila vazia.`
              : 'Fila vazia'
          } else {
            const items = queue
              .slice(0, 5)
              .map((t, i) => `${i + 1}. ${t.info.title}`)
              .join(', ')
            result = `Fila (${queue.length} tracks): ${items}${queue.length > 5 ? '...' : ''}`
          }
          break
        }

        case 'set_volume': {
          if (!player) {
            result = 'Player não ativo'
            break
          }
          const vol = Math.min(100, Math.max(0, args.volume || 50))
          await player.setVolume(vol)
          result = `Volume setado pra ${vol}%`
          break
        }

        case 'stop_music': {
          if (!player) {
            result = 'Player não ativo'
            break
          }
          await player.destroy()
          result = 'Parei a música e limpei a fila'
          break
        }

        case 'shuffle_queue': {
          if (!player || player.queue.tracks.length < 2) {
            result = 'Fila muito curta pra embaralhar'
            break
          }
          await player.queue.shuffle()
          result = 'Embaralhei a fila'
          break
        }

        default:
          result = `Tool "${tc.name}" not recognized`
      }

      results.push({ name: tc.name, result })
    }

    return results
  }

  // -----------------------------------------------------------------------
  // Fact extraction (async, fast provider)
  // -----------------------------------------------------------------------

  private async extractAndSaveFacts(
    userMessage: string,
    aiResponse: string,
    userId: string,
    guildId: string
  ): Promise<void> {
    if (!this.memory || !userMessage.trim()) return

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
      const completion = await fastProvider.client.chat.completions.create({
        model: fastProvider.models[0],
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 200,
        stream: false,
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'
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
    } catch {
      logger.debug('Fact extraction parse error (non-critical)')
    }
  }

  // -----------------------------------------------------------------------
  // Brain dump (memory button)
  // -----------------------------------------------------------------------

  async getUserBrainDump(userId: string, guildId: string): Promise<string> {
    if (!this.memory) return 'Minha memória tá off no momento.'

    const facts = await this.memory.getFacts(userId, guildId)
    const rel = await this.memory.getRelationships(userId, guildId)
    const insights = await this.memory.getUserInsights(userId, guildId)

    const parts: string[] = []

    if (rel.nickname) parts.push(`**Apelido:** ${rel.nickname}`)
    parts.push(`**Closeness:** ${rel.closeness}/100`)

    if (facts.length > 0) {
      parts.push(`\n**O que eu sei sobre você:**`)
      for (const f of facts.slice(0, 15)) parts.push(`• ${f.fact}`)
    } else {
      parts.push(`\nAinda não sei nada sobre você. Conversa mais comigo!`)
    }

    if (rel.insideJokes.length > 0) {
      parts.push(`\n**Piadas internas:** ${rel.insideJokes.join(', ')}`)
    }
    if (insights.topCommands.length > 0) {
      parts.push(`\n**Comandos favoritos:** ${insights.topCommands.join(', ')}`)
    }

    const sentimentIcon =
      insights.sentiment === 'positive' ? '😊' : insights.sentiment === 'negative' ? '😠' : '😐'
    parts.push(`\n**Vibe geral:** ${sentimentIcon} ${insights.sentiment}`)

    // RAG stats
    if (this.qdrantReady) {
      parts.push(`\n**Memória semântica:** ativa (Qdrant)`)
    }

    return parts.join('\n')
  }

  // -----------------------------------------------------------------------
  // Public getters
  // -----------------------------------------------------------------------

  getPersonalities(): Record<string, MahinaPersonality> {
    return { ...PERSONALITIES }
  }

  getPersonality(name: string): MahinaPersonality | undefined {
    return PERSONALITIES[name]
  }

  isAvailable(): boolean {
    return this.providerOrder.length > 0
  }
}

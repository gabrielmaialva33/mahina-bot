import OpenAI from 'openai'
import { EmbedBuilder } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface AIPersonality {
  name: string
  description: string
  systemPrompt: string
  temperature: number
  emoji: string
}

export interface ContextAnalysis {
  isAskingAboutMusic: boolean
  isAskingForHelp: boolean
  isAskingAboutCommands: boolean
  sentiment: 'positive' | 'neutral' | 'negative'
  language: string
}

export class AIService {
  private openai: OpenAI
  private client: MahinaBot
  private personalities: Map<string, AIPersonality>
  private rateLimiter: Map<string, number[]> = new Map()

  constructor(client: MahinaBot) {
    this.client = client
    this.openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.NVIDIA_API_KEY ? 'https://integrate.api.nvidia.com/v1' : undefined,
    })

    this.setupPersonalities()
  }

  private setupPersonalities() {
    this.personalities = new Map([
      [
        'friendly',
        {
          name: 'Amigável',
          description: 'Mahina em modo amigável e casual',
          emoji: '😊',
          temperature: 0.7,
          systemPrompt: `Você é Mahina, uma assistente musical inteligente e amigável do Discord.
        Seja casual, use emojis ocasionalmente e mantenha um tom divertido e acolhedor.
        Responda de forma concisa mas informativa.`,
        },
      ],
      [
        'professional',
        {
          name: 'Profissional',
          description: 'Mahina em modo profissional e formal',
          emoji: '💼',
          temperature: 0.3,
          systemPrompt: `Você é Mahina, uma assistente profissional do Discord especializada em música.
        Mantenha um tom formal e profissional, focando em fornecer informações precisas e úteis.
        Evite gírias e mantenha respostas estruturadas.`,
        },
      ],
      [
        'playful',
        {
          name: 'Brincalhona',
          description: 'Mahina em modo divertido e energético',
          emoji: '🎉',
          temperature: 0.9,
          systemPrompt: `Você é Mahina, uma assistente super divertida e energética! 🎵
        Use MUITOS emojis, seja super animada e faça piadas relacionadas a música!
        Seja criativa e espontânea nas respostas! 🎶✨`,
        },
      ],
      [
        'dj',
        {
          name: 'DJ Mode',
          description: 'Mahina como uma DJ profissional',
          emoji: '🎧',
          temperature: 0.6,
          systemPrompt: `Você é DJ Mahina, uma DJ profissional e especialista em música! 🎧
        Fale como uma DJ, use termos musicais, sugira playlists e mixagens.
        Seja cool e confiante, como uma verdadeira DJ! 🎵🔥`,
        },
      ],
    ])
  }

  // Rate limiting check
  checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const userTimestamps = this.rateLimiter.get(userId) || []

    // Remove old timestamps
    const validTimestamps = userTimestamps.filter((ts) => now - ts < windowMs)

    if (validTimestamps.length >= limit) {
      return false // Rate limit exceeded
    }

    validTimestamps.push(now)
    this.rateLimiter.set(userId, validTimestamps)
    return true
  }

  // Analyze message context
  analyzeContext(message: string): ContextAnalysis {
    const lowerMessage = message.toLowerCase()

    // Music-related keywords
    const musicKeywords = [
      'música',
      'music',
      'tocar',
      'play',
      'pause',
      'skip',
      'volume',
      'playlist',
      'queue',
      'fila',
      'som',
    ]
    const helpKeywords = ['ajuda', 'help', 'como', 'how', 'comando', 'command', 'usar', 'use']
    const commandKeywords = ['!', 'prefix', 'comandos', 'commands', 'lista', 'list']

    // Sentiment analysis (basic)
    const positiveWords = [
      'obrigado',
      'thanks',
      'ótimo',
      'great',
      'bom',
      'good',
      'adoro',
      'love',
      'perfeito',
      'perfect',
    ]
    const negativeWords = [
      'ruim',
      'bad',
      'erro',
      'error',
      'problema',
      'problem',
      'não funciona',
      "doesn't work",
    ]

    const positiveCount = positiveWords.filter((word) => lowerMessage.includes(word)).length
    const negativeCount = negativeWords.filter((word) => lowerMessage.includes(word)).length

    // Language detection (basic)
    const portugueseIndicators = ['você', 'é', 'está', 'não', 'sim', 'por favor', 'obrigado']
    const englishIndicators = ['you', 'is', 'are', 'not', 'yes', 'please', 'thanks']

    const ptCount = portugueseIndicators.filter((word) => lowerMessage.includes(word)).length
    const enCount = englishIndicators.filter((word) => lowerMessage.includes(word)).length

    return {
      isAskingAboutMusic: musicKeywords.some((keyword) => lowerMessage.includes(keyword)),
      isAskingForHelp: helpKeywords.some((keyword) => lowerMessage.includes(keyword)),
      isAskingAboutCommands: commandKeywords.some((keyword) => lowerMessage.includes(keyword)),
      sentiment:
        negativeCount > positiveCount ? 'negative' : positiveCount > 0 ? 'positive' : 'neutral',
      language: ptCount > enCount ? 'pt' : 'en',
    }
  }

  async generateResponse(
    messages: ChatMessage[],
    userName: string,
    channelName: string,
    personality: string = 'friendly',
    guildId?: string
  ): Promise<string> {
    try {
      // Get last user message for context analysis
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
      const context = lastUserMessage ? this.analyzeContext(lastUserMessage.content) : null

      // Get personality
      const selectedPersonality =
        this.personalities.get(personality) || this.personalities.get('friendly')!

      // Build enhanced system prompt based on context
      let systemPrompt =
        selectedPersonality.systemPrompt +
        `\n
      Você está conversando com ${userName} no canal ${channelName}.
      Você tem memória das conversas anteriores neste canal.

      IMPORTANTE: Seja sempre coerente e concisa nas suas respostas.
      Mantenha as respostas objetivas, úteis e relevantes ao contexto.
      Evite respostas muito longas ou dispersas.`

      // Add context-specific instructions
      if (context) {
        if (context.isAskingAboutMusic) {
          systemPrompt += `\nO usuário está perguntando sobre música. Mencione comandos relevantes como !play, !pause, !skip, !queue.`
        }
        if (context.isAskingForHelp) {
          systemPrompt += `\nO usuário precisa de ajuda. Seja extra clara e forneça exemplos específicos.`
        }
        if (context.isAskingAboutCommands) {
          systemPrompt += `\nO usuário quer saber sobre comandos. Sugira usar !help para ver todos os comandos disponíveis.`
        }
        if (context.sentiment === 'negative') {
          systemPrompt += `\nO usuário parece estar tendo problemas. Seja empática e ofereça soluções.`
        }
        if (context.language === 'en') {
          systemPrompt += `\nRespond in English.`
        }
      }

      // Add current music status if available
      if (guildId) {
        const player = this.client.manager.getPlayer(guildId)
        if (player?.playing && player.queue.current) {
          systemPrompt += `\n\nMúsica tocando agora: "${player.queue.current.info.title}" de ${player.queue.current.info.author}`
        }
      }

      // Prepare messages for API
      const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ]

      // Call AI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.NVIDIA_API_KEY ? 'meta/llama-3.1-405b-instruct' : 'gpt-3.5-turbo',
        messages: apiMessages,
        temperature: selectedPersonality.temperature,
        max_tokens: 500,
        stream: false,
      })

      let response =
        completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.'

      // Add personality emoji
      response = `${selectedPersonality.emoji} ${response}`

      return response
    } catch (error) {
      console.error('AI Service Error:', error)
      throw error
    }
  }

  getPersonalities(): Map<string, AIPersonality> {
    return this.personalities
  }

  getPersonality(name: string): AIPersonality | undefined {
    return this.personalities.get(name)
  }

  createErrorEmbed(error: string): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.color.red)
      .setTitle('❌ Erro ao processar mensagem')
      .setDescription(error)
      .setFooter({ text: 'Tente novamente mais tarde' })
  }

  createTypingEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.color.violet)
      .setDescription('💭 Mahina está pensando...')
  }

  createRateLimitEmbed(timeLeft: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.color.yellow)
      .setTitle('⏱️ Calma aí!')
      .setDescription(
        `Você está enviando mensagens muito rápido! Aguarde ${timeLeft.toFixed(1)} segundos.`
      )
      .setFooter({ text: 'Limite: 10 mensagens por minuto' })
  }

  createPersonalityEmbed(personalities: Map<string, AIPersonality>, current: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('🎭 Personalidades da Mahina')
      .setDescription('Escolha uma personalidade para a Mahina!')
      .setFooter({ text: `Personalidade atual: ${current}` })

    personalities.forEach((personality, key) => {
      embed.addFields({
        name: `${personality.emoji} ${personality.name}`,
        value: personality.description,
        inline: true,
      })
    })

    return embed
  }
}

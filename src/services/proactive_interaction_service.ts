import { EmbedBuilder, Guild, TextChannel } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface ChannelActivity {
  lastMessageTime: Date
  lastInteractionTime: Date
  messageCount: number
  topic?: string
}

interface InteractionPrompt {
  category: string
  prompts: string[]
  emojis: string[]
}

export class ProactiveInteractionService {
  private client: MahinaBot
  private channelActivity: Map<string, ChannelActivity> = new Map()
  private interactionInterval: NodeJS.Timer | null = null
  private readonly INACTIVITY_THRESHOLD = 3 * 60 * 60 * 1000 // 3 hours
  private readonly CHECK_INTERVAL = 30 * 60 * 1000 // Check every 30 minutes

  private interactionPrompts: InteractionPrompt[] = [
    {
      category: 'music',
      prompts: [
        '🎵 Tá muito quieto aqui... Que tal uma música para animar?',
        '🎶 Alguém quer ouvir algo especial? Estou aqui para tocar!',
        '🎸 Esse silêncio tá me deixando triste... Vamos colocar um som?',
        '🎤 Ei pessoal! Que tipo de música vocês curtem?',
        '🎧 Posso recomendar algumas playlists incríveis se quiserem!',
      ],
      emojis: ['🎵', '🎶', '🎸', '🎤', '🎧', '🎺', '🎹'],
    },
    {
      category: 'conversation',
      prompts: [
        '👋 Oi gente! Como vocês estão hoje?',
        '💬 Alguém aí? Tô sentindo falta de conversar!',
        '🤔 Qual foi a melhor coisa que aconteceu com vocês essa semana?',
        '😊 Que saudade de vocês! O que andam aprontando?',
        '🌟 Ei, vocês sabiam que posso fazer várias coisas legais? Perguntem!',
        '💭 Tava pensando aqui... Qual é o sonho de vocês?',
        '🎮 Alguém jogando algo legal? Adoro ouvir sobre games!',
      ],
      emojis: ['👋', '💬', '🤔', '😊', '🌟', '💭', '🎮'],
    },
    {
      category: 'fun',
      prompts: [
        '🎲 Que tal um desafio? Quem consegue me fazer rir?',
        '🎯 Vamos jogar algo? Posso contar piadas ou curiosidades!',
        '🎨 Alguém quer que eu crie algo criativo com IA?',
        '📸 Mandem fotos que eu analiso com minha visão!',
        '🤖 Sabiam que tenho personalidades diferentes? Usem /personality!',
        '✨ Posso gerar imagens incríveis! Querem ver?',
        '🎪 Tá na hora do show! Quem quer ver mágica de IA?',
      ],
      emojis: ['🎲', '🎯', '🎨', '📸', '🤖', '✨', '🎪'],
    },
    {
      category: 'help',
      prompts: [
        '💡 Ei, precisam de ajuda com algo? Tô aqui!',
        '🆘 Lembrem que posso ajudar com código, perguntas e muito mais!',
        '📚 Querem aprender algo novo hoje? Posso ensinar!',
        '🔧 Precisam debugar algum código? Sou expert nisso!',
        '📖 Posso explicar qualquer coisa que vocês quiserem saber!',
      ],
      emojis: ['💡', '🆘', '📚', '🔧', '📖'],
    },
    {
      category: 'motivation',
      prompts: [
        '💪 Vocês são incríveis! Nunca esqueçam disso!',
        '🌈 Cada dia é uma nova oportunidade de ser feliz!',
        '⭐ Acreditem em vocês mesmos! Vocês conseguem!',
        '🚀 O céu não é o limite quando existem pegadas na lua!',
        '❤️ Vocês fazem esse servidor ser especial!',
        '🌺 Lembrem-se: depois da tempestade vem a bonança!',
      ],
      emojis: ['💪', '🌈', '⭐', '🚀', '❤️', '🌺'],
    },
  ]

  constructor(client: MahinaBot) {
    this.client = client
  }

  async start(): Promise<void> {
    logger.info('Starting Proactive Interaction Service')

    // Initialize channel activity tracking
    await this.initializeChannelTracking()

    // Start the interaction check interval
    this.interactionInterval = setInterval(() => {
      this.checkAndInteract()
    }, this.CHECK_INTERVAL)

    // Do an initial check after 5 minutes
    setTimeout(
      () => {
        this.checkAndInteract()
      },
      5 * 60 * 1000
    )
  }

  stop(): void {
    if (this.interactionInterval) {
      clearInterval(this.interactionInterval)
      this.interactionInterval = null
    }
    logger.info('Proactive Interaction Service stopped')
  }

  private async initializeChannelTracking(): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased() && channel instanceof TextChannel) {
          // Skip certain channels
          if (this.shouldSkipChannel(channel)) continue

          this.channelActivity.set(channel.id, {
            lastMessageTime: new Date(),
            lastInteractionTime: new Date(),
            messageCount: 0,
            topic: channel.topic || undefined,
          })
        }
      }
    }
  }

  private shouldSkipChannel(channel: TextChannel): boolean {
    const skipPatterns = [
      /announcement/i,
      /rules/i,
      /logs?/i,
      /admin/i,
      /staff/i,
      /moderator/i,
      /bot-commands?/i,
    ]

    const channelName = channel.name.toLowerCase()
    return skipPatterns.some((pattern) => pattern.test(channelName))
  }

  async updateActivity(channelId: string): Promise<void> {
    const activity = this.channelActivity.get(channelId)
    if (activity) {
      activity.lastMessageTime = new Date()
      activity.messageCount++
    }
  }

  private async checkAndInteract(): Promise<void> {
    const now = new Date()

    for (const [channelId, activity] of this.channelActivity.entries()) {
      const timeSinceLastMessage = now.getTime() - activity.lastMessageTime.getTime()

      if (timeSinceLastMessage >= this.INACTIVITY_THRESHOLD) {
        try {
          const channel = this.client.channels.cache.get(channelId) as TextChannel
          if (
            !channel ||
            !channel.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
          ) {
            continue
          }

          // Check if bot already interacted recently
          const timeSinceLastInteraction = now.getTime() - activity.lastInteractionTime.getTime()
          if (timeSinceLastInteraction < this.INACTIVITY_THRESHOLD) {
            continue
          }

          await this.sendProactiveMessage(channel)
          activity.lastInteractionTime = new Date()
        } catch (error) {
          logger.error(`Failed to send proactive message to channel ${channelId}:`, error)
        }
      }
    }
  }

  private async sendProactiveMessage(channel: TextChannel): Promise<void> {
    // Randomly select a category
    const category =
      this.interactionPrompts[Math.floor(Math.random() * this.interactionPrompts.length)]
    const prompt = category.prompts[Math.floor(Math.random() * category.prompts.length)]
    const emoji = category.emojis[Math.floor(Math.random() * category.emojis.length)]

    // Check if it's a music channel
    const isMusicChannel =
      /music|música|som|dj|radio/i.test(channel.name) ||
      (channel.topic && /music|música|som|dj|radio/i.test(channel.topic))

    if (isMusicChannel && Math.random() > 0.3) {
      // Higher chance of music-related messages in music channels
      const musicCategory = this.interactionPrompts.find((p) => p.category === 'music')!
      const musicPrompt =
        musicCategory.prompts[Math.floor(Math.random() * musicCategory.prompts.length)]
      await channel.send(musicPrompt)
    } else if (Math.random() > 0.7) {
      // 30% chance of sending an embed with suggestions
      await this.sendSuggestionEmbed(channel)
    } else {
      // Regular text message
      await channel.send(prompt)
    }

    // Add reactions to encourage interaction
    try {
      const messages = await channel.messages.fetch({ limit: 1 })
      const lastMessage = messages.first()
      if (lastMessage && lastMessage.author.id === this.client.user?.id) {
        await lastMessage.react(emoji)
        if (Math.random() > 0.5) {
          await lastMessage.react('👍')
        }
      }
    } catch (error) {
      // Ignore reaction errors
    }
  }

  private async sendSuggestionEmbed(channel: TextChannel): Promise<void> {
    const suggestions = [
      {
        title: '🎵 Sugestões Musicais',
        description: 'Que tal experimentar alguns comandos musicais?',
        fields: [
          { name: '/play', value: 'Toque suas músicas favoritas', inline: true },
          { name: '/playlist', value: 'Crie playlists personalizadas', inline: true },
          { name: '/lyrics', value: 'Veja as letras das músicas', inline: true },
        ],
        color: 0x1db954,
      },
      {
        title: '🤖 Recursos de IA',
        description: 'Explore o poder da inteligência artificial!',
        fields: [
          { name: '/chat', value: 'Converse comigo sobre qualquer coisa', inline: true },
          { name: '/code', value: 'Ajuda com programação', inline: true },
          { name: '/vision', value: 'Analise imagens com IA', inline: true },
        ],
        color: 0x5865f2,
      },
      {
        title: '🎮 Vamos nos Divertir!',
        description: 'Comandos para entretenimento',
        fields: [
          { name: '/personality', value: 'Descubra seu animal espiritual do WoW', inline: true },
          { name: '/tools imagine', value: 'Crie imagens com IA', inline: true },
          { name: '/help', value: 'Veja todos os comandos', inline: true },
        ],
        color: 0xf1c40f,
      },
    ]

    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)]

    const embed = new EmbedBuilder()
      .setTitle(suggestion.title)
      .setDescription(suggestion.description)
      .addFields(suggestion.fields)
      .setColor(suggestion.color)
      .setFooter({
        text: 'Mahina Bot - Sempre aqui para vocês! 💜',
        iconURL: this.client.user?.displayAvatarURL(),
      })
      .setTimestamp()

    await channel.send({ embeds: [embed] })
  }

  // Method to handle new guilds
  async handleGuildCreate(guild: Guild): Promise<void> {
    for (const channel of guild.channels.cache.values()) {
      if (channel.isTextBased() && channel instanceof TextChannel) {
        if (this.shouldSkipChannel(channel)) continue

        this.channelActivity.set(channel.id, {
          lastMessageTime: new Date(),
          lastInteractionTime: new Date(0), // Allow immediate interaction in new guilds
          messageCount: 0,
          topic: channel.topic || undefined,
        })
      }
    }

    // Send welcome message to general channel if exists and has permissions
    const generalChannel = guild.channels.cache.find(
      (ch) =>
        ch.isTextBased() &&
        ch instanceof TextChannel &&
        (ch.name.includes('general') || ch.name.includes('geral') || ch.name.includes('chat')) &&
        ch.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
    ) as TextChannel

    if (generalChannel) {
      try {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🎵 Olá! Eu sou a Mahina!')
          .setDescription(
            `Muito obrigada por me adicionar ao **${guild.name}**! 💜\n\n` +
              '🎶 Sou especialista em música e tenho recursos de IA avançados!\n' +
              '🤖 Posso conversar, ajudar com código, analisar imagens e muito mais!'
          )
          .addFields(
            {
              name: '🎵 Comandos Musicais',
              value: '`/play` - Tocar músicas\n`/queue` - Ver fila\n`/lyrics` - Ver letras',
              inline: true,
            },
            {
              name: '🤖 IA Avançada',
              value:
                '`/chat` - Conversar comigo\n`/code` - Ajuda com código\n`/vision` - Analisar imagens',
              inline: true,
            },
            {
              name: '✨ Recursos Especiais',
              value:
                '`/personality` - Descubra seu animal espiritual\n`/help` - Ver todos os comandos',
              inline: true,
            }
          )
          .setColor(0x9b59b6)
          .setThumbnail(this.client.user?.displayAvatarURL())
          .setFooter({
            text: 'Use /help para ver todos os comandos disponíveis!',
            iconURL: this.client.user?.displayAvatarURL(),
          })

        await generalChannel.send({ embeds: [welcomeEmbed] })

        // Update activity to prevent immediate proactive message
        this.channelActivity.set(generalChannel.id, {
          lastMessageTime: new Date(),
          lastInteractionTime: new Date(),
          messageCount: 1,
          topic: generalChannel.topic || undefined,
        })
      } catch (error) {
        logger.error(`Failed to send welcome message to guild ${guild.id}:`, error)
      }
    }
  }

  // Method to handle channel creation
  async handleChannelCreate(channel: TextChannel): Promise<void> {
    if (this.shouldSkipChannel(channel)) return

    this.channelActivity.set(channel.id, {
      lastMessageTime: new Date(),
      lastInteractionTime: new Date(0),
      messageCount: 0,
      topic: channel.topic || undefined,
    })
  }

  // Get statistics
  getStatistics(): { totalChannels: number; inactiveChannels: number } {
    const now = new Date()
    let inactiveCount = 0

    for (const activity of this.channelActivity.values()) {
      const timeSinceLastMessage = now.getTime() - activity.lastMessageTime.getTime()
      if (timeSinceLastMessage >= this.INACTIVITY_THRESHOLD) {
        inactiveCount++
      }
    }

    return {
      totalChannels: this.channelActivity.size,
      inactiveChannels: inactiveCount,
    }
  }

  // Public method for testing proactive messages
  async sendTestMessage(channel: TextChannel): Promise<void> {
    await this.sendProactiveMessage(channel)
  }

  // Public method for forcing interaction check
  async forceInteractionCheck(): Promise<void> {
    await this.checkAndInteract()
  }
}

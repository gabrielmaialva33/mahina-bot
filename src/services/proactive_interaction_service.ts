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
  private interactionInterval: NodeJS.Timeout | null = null
  private recapCooldown: Map<string, number> = new Map()
  private callbackCooldown: Map<string, number> = new Map()
  private totalRecapsSent = 0
  private totalCallbacksSent = 0
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
      // Get the preferred channel for this guild
      const preferredChannel = await this.getPreferredChannelForGuild(guild.id)

      if (preferredChannel) {
        this.channelActivity.set(preferredChannel.id, {
          lastMessageTime: new Date(),
          lastInteractionTime: new Date(),
          messageCount: 0,
          topic: preferredChannel.topic || undefined,
        })
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

  private async getPreferredChannelForGuild(guildId: string): Promise<TextChannel | null> {
    try {
      const guild = this.client.guilds.cache.get(guildId)
      if (!guild) return null

      // Get AI config for this guild
      const guildData = await this.client.db.getGuild(guildId)
      const aiConfig = await this.client.db.getAIConfig(guildId)

      // If allowed channels are specified, use the first valid one
      if (aiConfig?.allowedChannels && aiConfig.allowedChannels.length > 0) {
        for (const channelId of aiConfig.allowedChannels) {
          const channel = guild.channels.cache.get(channelId) as TextChannel
          if (
            channel &&
            channel.isTextBased() &&
            channel instanceof TextChannel &&
            channel.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
          ) {
            return channel
          }
        }
      }

      // Otherwise, find the best general channel
      const preferredNames = [
        'general',
        'geral',
        'chat',
        'bate-papo',
        'conversa',
        'lounge',
        'social',
        'main',
        'principal',
        'lobby',
      ]

      // First try to find channels with preferred names
      for (const name of preferredNames) {
        const channel = guild.channels.cache.find(
          (ch) =>
            ch.isTextBased() &&
            ch instanceof TextChannel &&
            ch.name.toLowerCase().includes(name) &&
            !this.shouldSkipChannel(ch) &&
            ch.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
        ) as TextChannel

        if (channel) return channel
      }

      // If no preferred channel found, get the first available text channel
      const firstAvailable = guild.channels.cache.find(
        (ch) =>
          ch.isTextBased() &&
          ch instanceof TextChannel &&
          !this.shouldSkipChannel(ch) &&
          ch.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
      ) as TextChannel

      return firstAvailable || null
    } catch (error) {
      logger.error(`Failed to get preferred channel for guild ${guildId}:`, error)
      return null
    }
  }

  async updateActivity(channelId: string): Promise<void> {
    // Only update if this channel is being tracked
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
    const willContext = channel.guildId
      ? await this.client.services.mahinaWill?.getPromptContext(channel.guildId, channel.id)
      : undefined
    const socialPulse = channel.guildId
      ? await this.client.services.serverLearning?.getSocialPulseSnapshot(
          channel.guildId,
          channel.id
        )
      : null

    if (socialPulse && (await this.maybeSendSocialRecap(channel, socialPulse))) {
      await this.client.services.mahinaWill?.markSpoke(channel.guildId, channel.id)
      return
    }

    if (socialPulse) {
      const callback = this.buildContextCallback(channel.id, channel.name, socialPulse)
      if (callback) {
        await channel.send({ content: callback }).catch(() => {})
        this.callbackCooldown.set(channel.id, Date.now())
        this.totalCallbacksSent++
        await this.client.services.mahinaWill?.markSpoke(channel.guildId, channel.id)
        return
      }
    }

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
      await channel.send(
        willContext ? `${musicPrompt}\n-# ${willContext.split('\n')[1] ?? ''}` : musicPrompt
      )
    } else if (Math.random() > 0.7) {
      // 30% chance of sending an embed with suggestions
      await this.sendSuggestionEmbed(channel)
    } else {
      // Regular text message
      await channel.send(willContext ? `${prompt}\n-# ${willContext.split('\n')[1] ?? ''}` : prompt)
    }

    if (channel.guildId) {
      await this.client.services.mahinaWill?.markSpoke(channel.guildId, channel.id)
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
          {
            name: '/personality',
            value: 'Veja a leitura de vibe e personalidade de alguém',
            inline: true,
          },
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
        text: 'Mahina Bot - Sempre de olho no clima daqui',
        iconURL: this.client.user?.displayAvatarURL(),
      })
      .setTimestamp()

    await channel.send({ embeds: [embed] })
  }

  // Method to handle new guilds
  async handleGuildCreate(guild: Guild): Promise<void> {
    // Get the preferred channel for this guild
    const preferredChannel = await this.getPreferredChannelForGuild(guild.id)

    if (preferredChannel) {
      this.channelActivity.set(preferredChannel.id, {
        lastMessageTime: new Date(),
        lastInteractionTime: new Date(0), // Allow immediate interaction in new guilds
        messageCount: 0,
        topic: preferredChannel.topic || undefined,
      })
    }

    // Send welcome message to the preferred channel
    if (preferredChannel) {
      try {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🎵 Olá! Eu sou a Mahina!')
          .setDescription(
            `Muito obrigada por me adicionar ao **${guild.name}**! 💜\n\n` +
              '🎶 Cuido da parte musical e também tenho IA multimodal.\n' +
              '🤖 Posso conversar, analisar imagens, reagir ao clima do server e criar uma presença viva por aqui.'
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
                '`/personality` - Leitura de vibe\n`/aistatus` - Status social da IA\n`/help` - Ver tudo',
              inline: true,
            }
          )
          .setColor(0x9b59b6)
          .setThumbnail(this.client.user?.displayAvatarURL() || null)
          .setFooter({
            text: 'Use /help para ver todos os comandos disponíveis!',
            iconURL: this.client.user?.displayAvatarURL(),
          })

        await preferredChannel.send({ embeds: [welcomeEmbed] })

        // Update activity to prevent immediate proactive message
        this.channelActivity.set(preferredChannel.id, {
          lastMessageTime: new Date(),
          lastInteractionTime: new Date(),
          messageCount: 1,
          topic: preferredChannel.topic || undefined,
        })
      } catch (error) {
        logger.error(`Failed to send welcome message to guild ${guild.id}:`, error)
      }
    }
  }

  // Method to handle channel creation
  async handleChannelCreate(channel: TextChannel): Promise<void> {
    // Don't automatically track new channels
    // The bot will only track one preferred channel per guild
  }

  // Get statistics
  getStatistics(): {
    totalChannels: number
    inactiveChannels: number
    totalRecapsSent: number
    totalCallbacksSent: number
  } {
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
      totalRecapsSent: this.totalRecapsSent,
      totalCallbacksSent: this.totalCallbacksSent,
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

  private async maybeSendSocialRecap(
    channel: TextChannel,
    socialPulse: NonNullable<
      Awaited<
        ReturnType<NonNullable<MahinaBot['services']['serverLearning']>['getSocialPulseSnapshot']>
      >
    >
  ): Promise<boolean> {
    const lastRecap = this.recapCooldown.get(channel.id) ?? 0
    const now = Date.now()
    if (now - lastRecap < 12 * 60 * 60 * 1000) return false
    if (socialPulse.recentSummaries.length < 3) return false
    if (Math.random() > 0.22) return false

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('🧠 Recap do clima daqui')
      .setDescription('dei uma lida no que rolou e o resumo tá mais ou menos assim:')
      .addFields(
        {
          name: '🌆 Vibe',
          value:
            socialPulse.guildVibe.length > 0
              ? socialPulse.guildVibe.join(', ')
              : 'ainda entendendo melhor a vibe daqui',
          inline: false,
        },
        {
          name: '🎯 Assunto do canal',
          value:
            socialPulse.channelFocus.length > 0
              ? socialPulse.channelFocus.join(', ')
              : 'sem um foco dominante agora',
          inline: false,
        },
        {
          name: '🗣️ Jeito de falar',
          value:
            socialPulse.slang.length > 0
              ? socialPulse.slang.join(', ')
              : 'sem gíria dominante forte ainda',
          inline: false,
        },
        {
          name: '📝 Últimos sinais',
          value: socialPulse.recentSummaries
            .slice(0, 3)
            .map((item) => `• ${item}`)
            .join('\n'),
          inline: false,
        }
      )
      .setFooter({
        text: 'Mahina recap social',
        iconURL: this.client.user?.displayAvatarURL(),
      })

    await channel.send({ embeds: [embed] }).catch(() => {})
    this.recapCooldown.set(channel.id, now)
    this.totalRecapsSent++
    return true
  }

  private buildContextCallback(
    channelId: string,
    channelName: string,
    socialPulse: NonNullable<
      Awaited<
        ReturnType<NonNullable<MahinaBot['services']['serverLearning']>['getSocialPulseSnapshot']>
      >
    >
  ): string | null {
    const lastCallback = this.callbackCooldown.get(channelId) ?? 0
    if (Date.now() - lastCallback < 3 * 60 * 60 * 1000) return null
    if (Math.random() > 0.35) return null

    if (socialPulse.recurringPhrases.length > 0) {
      return `ceis sempre voltam em ${socialPulse.recurringPhrases[0]} nesse canto, impressionante kkkkk`
    }

    if (socialPulse.channelFocus.length > 0 && socialPulse.guildVibe.length > 0) {
      return `o ${channelName} tá muito ${socialPulse.guildVibe[0]} hoje. assunto do momento: ${socialPulse.channelFocus[0]}.`
    }

    if (socialPulse.slang.length > 0) {
      return `já deu pra sacar que o dialeto daqui gira em torno de ${socialPulse.slang.slice(0, 3).join(', ')}.`
    }

    return null
  }
}

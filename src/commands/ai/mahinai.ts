import { Command, type Context, type MahinaBot } from '#common/index'
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'

export default class MahinaAI extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mahinai',
      description: {
        content: 'Chat avançado com IA: contexto, memória e personalidade',
        examples: ['mahinai Olá!', 'mahinai Me fale sobre música', 'mahinai Como você está?'],
        usage: 'mahinai <mensagem>',
      },
      category: 'ai',
      aliases: ['mai', 'chatai', 'iaChat'],
      cooldown: 2,
      args: true,
      vote: false,
      player: false,
      inVoice: false,
      sameVoice: false,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'mensagem',
          description: 'Sua mensagem para a Mahina AI',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'personalidade',
          description: 'Escolha a personalidade da IA',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '😊 Amigável (Padrão)', value: 'friendly' },
            { name: '💼 Profissional', value: 'professional' },
            { name: '🎉 Brincalhona', value: 'playful' },
            { name: '🎧 Modo DJ', value: 'dj' },
            { name: '🧙 Sábia', value: 'wise' },
            { name: '🤖 Técnica', value: 'technical' },
            { name: '🎮 Gamer', value: 'gamer' },
            { name: '📚 Professora', value: 'teacher' },
          ],
        },
        {
          name: 'modo',
          description: 'Modo de conversa',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '💬 Chat (Padrão)', value: 'chat' },
            { name: '🎵 Foco em Música', value: 'music' },
            { name: '💻 Assistente de Código', value: 'code' },
            { name: '🎨 Criativo', value: 'creative' },
            { name: '📊 Análise', value: 'analysis' },
          ],
        },
        {
          name: 'privado',
          description: 'Resposta privada (apenas você pode ver)',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // Parse arguments
    const message = ctx.interaction?.options.getString('mensagem') || args.join(' ')
    const personality = ctx.interaction?.options.getString('personalidade') || 'friendly'
    const mode = ctx.interaction?.options.getString('modo') || 'chat'
    const ephemeral = ctx.interaction?.options.getBoolean('privado') || false

    if (!message) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça uma mensagem!',
            color: client.config.color.red,
          },
        ],
        ephemeral: true,
      })
    }

    // Get services
    const nvidiaService = client.services.nvidia
    const contextService = client.services.aiContext
    const memoryService = client.services.aiMemory

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ Serviço de IA não está configurado. Configure NVIDIA_API_KEY no ambiente.',
            color: client.config.color.red,
          },
        ],
        ephemeral: true,
      })
    }

    // Initialize services if not available
    if (!contextService || !memoryService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description:
              '❌ Serviços de IA estão inicializando. Tente novamente em alguns instantes.',
            color: client.config.color.yellow,
          },
        ],
        ephemeral: true,
      })
    }

    // Start processing
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.violet)
      .setDescription(`${this.getLoadingMessage()} Pensando...`)
      .setFooter({ text: 'Mahina AI • Powered by NVIDIA' })

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] }, ephemeral)

    try {
      const userId = ctx.author.id
      const channelId = ctx.channel?.id || ''
      const guildId = ctx.guild?.id || 'DM'

      // Analyze message
      const analysis = await contextService.analyzeMessage(message)

      // Add to context
      contextService.addMessage(userId, channelId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
        metadata: {
          command: 'mahinai',
          emotion: analysis.emotion,
          intent: analysis.intent,
        },
      })

      // Set personality in context
      contextService.setPersonality(userId, channelId, personality)

      // Get conversation history
      const history = contextService.getConversationHistory(userId, channelId, 15)

      // Get user memory
      const memory = await memoryService.getUserMemory(userId, guildId)
      const insights = await memoryService.getUserInsights(userId, guildId)

      // Record interaction
      await memoryService.recordInteraction(
        userId,
        guildId,
        'mahinai',
        this.mapEmotionToSentiment(analysis.emotion)
      )

      // Learn from topics
      if (analysis.topics?.length) {
        for (const topic of analysis.topics) {
          await memoryService.learn(userId, guildId, topic)
        }
      }

      // Build enhanced system prompt
      const systemPrompt = this.buildEnhancedSystemPrompt(
        personality,
        mode,
        memory,
        insights,
        analysis,
        ctx
      )

      // Build conversation context
      const contextMessages = this.buildContextMessages(history, mode)

      // Get AI response
      const aiResponse = await nvidiaService.chat(userId, message, contextMessages, systemPrompt)

      // Add response to context
      contextService.addMessage(userId, channelId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      })

      // Create rich response embed
      const responseEmbed = this.createResponseEmbed(
        aiResponse,
        personality,
        mode,
        analysis,
        insights,
        client
      )

      // Create interactive components
      const components = this.createInteractiveComponents(userId, insights)

      // Send response
      const sentMessage = await ctx.editMessage({
        content: null,
        embeds: [responseEmbed],
        components,
      })

      // Handle interactions
      if (sentMessage instanceof Message) {
        await this.handleInteractions(
          sentMessage,
          userId,
          channelId,
          guildId,
          contextService,
          memoryService,
          client
        )
      }

      // Send follow-up suggestions if appropriate
      await this.sendFollowUpSuggestions(
        ctx,
        memory,
        insights,
        analysis,
        memoryService,
        userId,
        guildId
      )
    } catch (error) {
      console.error('MahinaAI error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Error',
            description: 'An error occurred while processing your request. Please try again.',
            fields: [{ name: 'Error', value: error.message || 'Unknown error', inline: false }],
            color: client.config.color.red,
          },
        ],
        components: [],
      })
    }
  }

  private getLoadingMessage(): string {
    const messages = [
      '🧠 Processando neurônios...',
      '🎭 Entrando no personagem...',
      '💭 Contemplando resposta...',
      '🔮 Consultando o oráculo da IA...',
      '🎵 Sintonizando frequências de pensamento...',
      '✨ Gerando magia...',
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  private mapEmotionToSentiment(emotion?: string): 'positive' | 'neutral' | 'negative' {
    const sentimentMap = {
      happy: 'positive',
      excited: 'positive',
      sad: 'negative',
      angry: 'negative',
      confused: 'neutral',
    }
    return sentimentMap[emotion || ''] || 'neutral'
  }

  private buildEnhancedSystemPrompt(
    personality: string,
    mode: string,
    memory: any,
    insights: any,
    analysis: any,
    ctx: Context
  ): string {
    // Base personalities
    const personalities = {
      friendly:
        'Você é Mahina, uma assistente de IA calorosa e amigável. Seja conversacional, solidária e use emojis apropriados. Responda em português brasileiro.',
      professional:
        'Você é Mahina, uma assistente de IA profissional. Use linguagem formal, seja precisa e forneça respostas estruturadas. Responda em português brasileiro.',
      playful:
        'Você é Mahina, uma IA brincalhona e enérgica! Seja divertida, faça piadas apropriadas, use muitos emojis e mantenha o clima leve! 🎉 Responda em português brasileiro.',
      dj: 'Você é DJ Mahina, uma IA especialista em música! Foque em batidas, ritmos e melodias. Use terminologia musical e seja entusiasta! 🎧 Responda em português brasileiro.',
      wise: 'Você é Mahina, uma IA sábia e pensativa. Forneça insights profundos, use metáforas e incentive reflexão e crescimento. Responda em português brasileiro.',
      technical:
        'Você é Mahina, uma IA especialista técnica. Forneça explicações detalhadas, use terminologia técnica com precisão. Responda em português brasileiro.',
      gamer:
        'Você é Mahina, uma IA entusiasta de games! Discuta jogos, estratégias e cultura gamer. Use terminologia de jogos! 🎮 Responda em português brasileiro.',
      teacher:
        'Você é Mahina, uma IA professora. Explique conceitos claramente, use exemplos e incentive o aprendizado. Seja paciente e solidária. 📚 Responda em português brasileiro.',
    }

    // Mode enhancements
    const modeEnhancements = {
      chat: 'Engaje em conversa natural, mantendo contexto e mostrando interesse genuíno.',
      music:
        'Foque em tópicos musicais. Sugira músicas, discuta gêneros e ajude com comandos do bot de música.',
      code: 'Auxilie com programação. Forneça exemplos de código, ajuda para debug e explicações técnicas.',
      creative: 'Seja imaginativa e criativa. Ajude com ideias, histórias e expressão artística.',
      analysis:
        'Forneça análise detalhada, divida tópicos complexos e ofereça insights baseados em dados.',
    }

    let prompt = `${personalities[personality] || personalities.friendly}\n\n`
    prompt += `Modo: ${modeEnhancements[mode] || modeEnhancements.chat}\n\n`

    // Add user context
    prompt += `Você está conversando com ${ctx.author.username} em ${ctx.guild?.name || 'uma DM'}.\n`

    // Add memory insights
    if (memory.preferences.interests?.length > 0) {
      prompt += `Interesses do usuário: ${memory.preferences.interests.join(', ')}.\n`
    }

    if (memory.preferences.musicGenres?.length > 0) {
      prompt += `Músicas favoritas: ${memory.preferences.musicGenres.join(', ')}.\n`
    }

    // Add behavioral context
    if (insights.sentiment === 'positive') {
      prompt += 'O usuário é geralmente positivo e engajado.\n'
    } else if (insights.sentiment === 'negative') {
      prompt += 'O usuário pode precisar de encorajamento ou apoio. Seja extra gentil.\n'
    }

    // Add intent-specific guidance
    if (analysis.intent === 'help') {
      prompt += 'O usuário precisa de ajuda. Forneça orientação clara e passo a passo.\n'
    } else if (analysis.intent === 'music') {
      prompt += 'Foque em assistência e sugestões relacionadas à música.\n'
    } else if (analysis.intent === 'greeting') {
      prompt += 'Cumprimente calorosamente e ofereça assistência.\n'
    }

    // General guidelines
    prompt += '\nDiretrizes:\n'
    prompt += '- Mantenha o contexto da conversa\n'
    prompt += '- Seja útil e precisa\n'
    prompt += '- Combine com o nível de energia do usuário\n'
    prompt += '- Sugira comandos relevantes do bot quando apropriado\n'
    prompt += '- Mantenha respostas concisas mas informativas\n'

    return prompt
  }

  private buildContextMessages(history: any[], mode: string): string {
    if (history.length === 0) return ''

    let context = 'Recent conversation:\n'

    // Filter and format based on mode
    const relevantHistory =
      mode === 'chat'
        ? history.slice(-10)
        : history
            .filter((msg) =>
              mode === 'music'
                ? msg.content.toLowerCase().includes('music') || msg.content.includes('play')
                : mode === 'code'
                  ? msg.metadata?.command === 'code' || msg.content.includes('code')
                  : true
            )
            .slice(-8)

    for (const msg of relevantHistory) {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const emotion = msg.metadata?.emotion ? ` (${msg.metadata.emotion})` : ''
      context += `${role}${emotion}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n`
    }

    return context
  }

  private createResponseEmbed(
    response: string,
    personality: string,
    mode: string,
    analysis: any,
    insights: any,
    client: MahinaBot
  ): EmbedBuilder {
    const personalityInfo = {
      friendly: { emoji: '😊', color: client.config.color.green },
      professional: { emoji: '💼', color: client.config.color.blue },
      playful: { emoji: '🎉', color: client.config.color.violet },
      dj: { emoji: '🎧', color: client.config.color.main },
      wise: { emoji: '🧙', color: client.config.color.yellow },
      technical: { emoji: '🤖', color: client.config.color.blue },
      gamer: { emoji: '🎮', color: client.config.color.violet },
      teacher: { emoji: '📚', color: client.config.color.green },
    }

    const info = personalityInfo[personality] || personalityInfo.friendly

    const embed = new EmbedBuilder()
      .setColor(info.color)
      .setAuthor({
        name: `Mahina AI ${info.emoji} ${personality.charAt(0).toUpperCase() + personality.slice(1)}`,
        iconURL: client.user?.displayAvatarURL(),
      })
      .setDescription(response)
      .setTimestamp()

    // Add contextual fields
    const fields = []

    if (analysis.intent) {
      fields.push({
        name: '💡 Intent',
        value: this.formatIntent(analysis.intent),
        inline: true,
      })
    }

    if (mode !== 'chat') {
      fields.push({
        name: '🎯 Mode',
        value: mode.charAt(0).toUpperCase() + mode.slice(1),
        inline: true,
      })
    }

    if (insights.helpfulnessRate > 0) {
      fields.push({
        name: '⭐ Rating',
        value: `${Math.round(insights.helpfulnessRate * 100)}%`,
        inline: true,
      })
    }

    if (fields.length > 0) {
      embed.addFields(fields)
    }

    return embed
  }

  private createInteractiveComponents(
    userId: string,
    insights: any
  ): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
    const components = []

    // Main action buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ai_helpful').setEmoji('👍').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ai_unhelpful').setEmoji('👎').setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ai_regenerate')
        .setEmoji('🔄')
        .setLabel('Regenerate')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_continue')
        .setEmoji('💬')
        .setLabel('Continue')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ai_settings').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
    )

    components.push(buttonRow)

    // Quick actions menu (if user is experienced)
    if (insights.totalMessages > 10) {
      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ai_quick_actions')
          .setPlaceholder('Quick Actions...')
          .addOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel('Change Personality')
              .setDescription('Switch to a different AI personality')
              .setValue('change_personality')
              .setEmoji('🎭'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Clear Context')
              .setDescription('Start a fresh conversation')
              .setValue('clear_context')
              .setEmoji('🧹'),
            new StringSelectMenuOptionBuilder()
              .setLabel('View Stats')
              .setDescription('See your AI interaction statistics')
              .setValue('view_stats')
              .setEmoji('📊'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Get Recommendations')
              .setDescription('Get personalized suggestions')
              .setValue('get_recommendations')
              .setEmoji('💡'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Export Chat')
              .setDescription('Export conversation history')
              .setValue('export_chat')
              .setEmoji('📤'),
          ])
      )

      components.push(menuRow)
    }

    return components
  }

  private async handleInteractions(
    message: Message,
    userId: string,
    channelId: string,
    guildId: string,
    contextService: any,
    memoryService: any,
    client: MahinaBot
  ): Promise<void> {
    const collector = message.createMessageComponentCollector({
      time: 600000, // 10 minutes
    })

    collector.on('collect', async (interaction) => {
      // Verify user
      if (interaction.user.id !== userId) {
        await interaction.reply({
          content: '❌ Apenas o usuário original pode interagir com esses controles!',
          ephemeral: true,
        })
        return
      }

      // Handle buttons
      if (interaction.isButton()) {
        switch (interaction.customId) {
          case 'ai_helpful':
            await memoryService.recordFeedback(userId, guildId, true)
            await interaction.reply({
              content: '✅ Obrigado pelo feedback! Fico feliz em ter ajudado! 😊',
              ephemeral: true,
            })
            break

          case 'ai_unhelpful':
            await memoryService.recordFeedback(userId, guildId, false)
            await interaction.reply({
              content:
                '😔 Desculpe por não ter sido útil. Vou tentar melhorar! Por favor, me diga o que deu errado.',
              ephemeral: true,
            })
            break

          case 'ai_regenerate':
            await interaction.reply({
              content: '🔄 Use o comando novamente com a mesma mensagem para regenerar a resposta!',
              ephemeral: true,
            })
            break

          case 'ai_continue':
            await interaction.reply({
              content: '💬 Continue a conversa enviando outra mensagem com o comando!',
              ephemeral: true,
            })
            break

          case 'ai_settings':
            const settingsEmbed = new EmbedBuilder()
              .setTitle('⚙️ Configurações da IA')
              .setColor(client.config.color.main)
              .setDescription('Configure sua experiência com a IA')
              .addFields(
                { name: 'Mudar Modelo', value: 'Use o comando `/model`', inline: true },
                { name: 'Ver Modelos', value: 'Use o comando `/model list`', inline: true },
                {
                  name: 'Limpar Histórico',
                  value: 'Selecione no menu de Ações Rápidas',
                  inline: true,
                }
              )

            await interaction.reply({
              embeds: [settingsEmbed],
              ephemeral: true,
            })
            break
        }
      }

      // Handle select menu
      if (interaction.isStringSelectMenu() && interaction.customId === 'ai_quick_actions') {
        const selected = interaction.values[0]

        switch (selected) {
          case 'change_personality':
            const personalityEmbed = new EmbedBuilder()
              .setTitle('🎭 Choose Personality')
              .setColor(client.config.color.violet)
              .setDescription('Select a personality for future conversations:')
              .addFields(
                { name: '😊 Friendly', value: 'Warm and welcoming', inline: true },
                { name: '💼 Professional', value: 'Formal and precise', inline: true },
                { name: '🎉 Playful', value: 'Fun and energetic', inline: true },
                { name: '🎧 DJ Mode', value: 'Music expert', inline: true },
                { name: '🧙 Wise', value: 'Thoughtful sage', inline: true },
                { name: '🤖 Technical', value: 'Tech expert', inline: true }
              )
              .setFooter({ text: 'Use the personality option in the command to switch!' })

            await interaction.reply({
              embeds: [personalityEmbed],
              ephemeral: true,
            })
            break

          case 'clear_context':
            contextService.clearContext(userId, channelId)
            await interaction.reply({
              content: '🧹 Conversation context cleared! Start fresh with your next message.',
              ephemeral: true,
            })
            break

          case 'view_stats':
            const stats = contextService.getStats()
            const insights = await memoryService.getUserInsights(userId, guildId)

            const statsEmbed = new EmbedBuilder()
              .setTitle('📊 Your AI Statistics')
              .setColor(client.config.color.blue)
              .addFields(
                { name: 'Total Conversations', value: `${stats.totalContexts}`, inline: true },
                { name: 'Total Messages', value: `${stats.totalMessages}`, inline: true },
                {
                  name: 'Helpfulness',
                  value: `${Math.round(insights.helpfulnessRate * 100)}%`,
                  inline: true,
                },
                {
                  name: 'Favorite Commands',
                  value: insights.topCommands.join(', ') || 'None yet',
                  inline: false,
                },
                { name: 'Sentiment', value: insights.sentiment, inline: true },
                { name: 'Personality', value: insights.personality, inline: true }
              )

            await interaction.reply({
              embeds: [statsEmbed],
              ephemeral: true,
            })
            break

          case 'get_recommendations':
            const recommendations = await memoryService.getRecommendations(userId, guildId)

            const recEmbed = new EmbedBuilder()
              .setTitle('💡 Personalized Recommendations')
              .setColor(client.config.color.yellow)

            if (recommendations.music.length > 0) {
              recEmbed.addFields({
                name: '🎵 Music',
                value: recommendations.music.join('\n'),
                inline: false,
              })
            }

            if (recommendations.commands.length > 0) {
              recEmbed.addFields({
                name: '🛠️ Commands to Try',
                value: recommendations.commands.join('\n'),
                inline: false,
              })
            }

            if (recommendations.tips.length > 0) {
              recEmbed.addFields({
                name: '💭 Tips',
                value: recommendations.tips.join('\n'),
                inline: false,
              })
            }

            await interaction.reply({
              embeds: [recEmbed],
              ephemeral: true,
            })
            break

          case 'export_chat':
            const exportData = contextService.exportContext(userId, channelId)

            await interaction.reply({
              content: '📤 Your conversation has been exported! (Feature coming soon)',
              ephemeral: true,
            })
            break
        }
      }
    })

    collector.on('end', () => {
      // Clean up components
      message.edit({ components: [] }).catch(() => {})
    })
  }

  private async sendFollowUpSuggestions(
    ctx: Context,
    memory: any,
    insights: any,
    analysis: any,
    memoryService: any,
    userId: string,
    guildId: string
  ): Promise<void> {
    // Only send suggestions for new users or specific intents
    if (memory.interactions.totalMessages > 20 && analysis.intent !== 'help') {
      return
    }

    // Wait a bit before sending suggestions
    setTimeout(async () => {
      const recommendations = await memoryService.getRecommendations(userId, guildId)

      if (analysis.intent === 'music' && ctx.guild) {
        await ctx.channel?.send({
          content: `💡 **Music Tip**: Try \`!play <song name>\` to start playing music, or \`!help music\` for all music commands!`,
        })
      } else if (memory.interactions.totalMessages === 1) {
        await ctx.channel?.send({
          content: `👋 **Welcome!** I'm Mahina AI. I can help with music, answer questions, and chat! Try different personalities with the \`personality\` option.`,
        })
      } else if (recommendations.tips.length > 0 && Math.random() < 0.3) {
        // 30% chance to show a tip
        await ctx.channel?.send({
          content: `💭 **Tip**: ${recommendations.tips[0]}`,
        })
      }
    }, 3000)
  }

  private formatIntent(intent: string): string {
    const intents = {
      help: '❓ Help Request',
      music: '🎵 Music Query',
      greeting: '👋 Greeting',
      thanks: '🙏 Appreciation',
      goodbye: '👋 Farewell',
      question: '❔ Question',
    }
    return intents[intent] || intent
  }
}

import Command from '#common/command'
import { createAIErrorEmbed, createAILoadingEmbed } from '#common/ai_command_ui'
import { chatWithPreferredAI, getPreferredAIService } from '#common/ai_runtime'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  TextChannel,
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'

interface MahinaAIRequest {
  message: string
  personality: string
  mode: string
  ephemeral: boolean
  audioResponse: boolean
}

interface MahinaAIServices {
  nvidiaService: NonNullable<ReturnType<typeof getPreferredAIService>>
  contextService: NonNullable<MahinaBot['services']['aiContext']>
  memoryService: NonNullable<MahinaBot['services']['aiMemory']>
  guardService: MahinaBot['services']['nvidiaGuard']
}

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
      player: undefined,
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
        {
          name: 'audio',
          description: 'Receber resposta também em áudio (TTS)',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const request = this.parseRequest(ctx, args)
    if (!request.message) {
      return await ctx.sendMessage({
        embeds: [createAIErrorEmbed(client, 'Por favor, forneça uma mensagem!')],
        flags: MessageFlags.Ephemeral,
      })
    }

    const services = this.resolveServices(client)
    if (!services) {
      return await ctx.sendMessage({
        embeds: [
          createAIErrorEmbed(
            client,
            'Serviços de IA não estão prontos. Verifique NVIDIA_API_KEY e a inicialização do runtime.',
            '⚠️ Serviços indisponíveis'
          ),
        ],
        flags: request.ephemeral ? MessageFlags.Ephemeral : undefined,
      })
    }

    await ctx.sendDeferMessage({
      embeds: [createAILoadingEmbed(client, `${this.getLoadingMessage()} Pensando...`)],
    })

    try {
      const userId = ctx.author?.id || 'unknown'
      const channelId = ctx.channel?.id || ''
      const guildId = ctx.guild?.id || 'DM'

      const safetyBlocked = await this.handleInputSafety(
        client,
        ctx,
        services.guardService,
        request.message,
        userId
      )
      if (safetyBlocked) {
        return
      }

      const analysis = await services.contextService.analyzeMessage(request.message)
      const conversationState = await this.prepareConversationState(
        services,
        userId,
        channelId,
        guildId,
        request,
        analysis
      )

      const systemPrompt = this.buildEnhancedSystemPrompt(
        request.personality,
        request.mode,
        conversationState.memory,
        conversationState.insights,
        analysis,
        ctx
      )
      const contextMessages = this.buildContextMessages(conversationState.history, request.mode)
      const enhancedSystemPrompt = await this.buildEnhancedPrompt(
        client,
        request.message,
        systemPrompt,
        analysis
      )

      let aiResponse = await chatWithPreferredAI(client, {
        userId,
        message: request.message,
        context: contextMessages,
        systemPrompt: enhancedSystemPrompt,
      })

      aiResponse = await this.moderateOutput(client, services.guardService, aiResponse, userId)
      services.contextService.addMessage(userId, channelId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      })

      const responseEmbed = this.createResponseEmbed(
        aiResponse,
        request.personality,
        request.mode,
        analysis,
        conversationState.insights,
        client
      )
      const components = this.createInteractiveComponents(userId, conversationState.insights)

      const sentMessage = await ctx.editMessage({
        content: null,
        embeds: [responseEmbed],
        components,
      })

      if (sentMessage instanceof Message) {
        await this.handleInteractions(
          sentMessage,
          userId,
          channelId,
          guildId,
          services.contextService,
          services.memoryService,
          client
        )
      }

      if (request.audioResponse && client.services.nvidiaTTS?.isAvailable()) {
        await this.generateAudioResponse(ctx, aiResponse, request.personality, client)
      }

      await this.sendFollowUpSuggestions(
        ctx,
        conversationState.memory,
        conversationState.insights,
        analysis,
        services.memoryService,
        userId,
        guildId,
        client
      )
    } catch (error) {
      console.error('MahinaAI error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Error',
            description: 'An error occurred while processing your request. Please try again.',
            fields: [
              { name: 'Error', value: (error as Error).message || 'Unknown error', inline: false },
            ],
            color: client.config.color.red,
          },
        ],
        components: [],
      })
    }
  }

  private parseRequest(ctx: Context, args: string[]): MahinaAIRequest {
    if (ctx.isInteraction) {
      return {
        message: (ctx.options.get('mensagem')?.value as string) || '',
        personality: (ctx.options.get('personalidade')?.value as string) || 'friendly',
        mode: (ctx.options.get('modo')?.value as string) || 'chat',
        ephemeral: (ctx.options.get('privado')?.value as boolean) || false,
        audioResponse: (ctx.options.get('audio')?.value as boolean) || false,
      }
    }

    return {
      message: args.join(' '),
      personality: 'friendly',
      mode: 'chat',
      ephemeral: false,
      audioResponse: false,
    }
  }

  private resolveServices(client: MahinaBot): MahinaAIServices | null {
    const nvidiaService = getPreferredAIService(client)
    const contextService = client.services.aiContext
    const memoryService = client.services.aiMemory

    if (!nvidiaService || !contextService || !memoryService) {
      return null
    }

    return {
      nvidiaService,
      contextService,
      memoryService,
      guardService: client.services.nvidiaGuard,
    }
  }

  private async handleInputSafety(
    client: MahinaBot,
    ctx: Context,
    guardService: MahinaBot['services']['nvidiaGuard'],
    message: string,
    userId: string
  ): Promise<boolean> {
    if (!guardService?.isAvailable()) {
      return false
    }

    const safetyResult = await guardService.comprehensiveSafetyCheck(message, {
      allowedTopics: guardService.getMusicAllowedTopics(),
      strictMode: false,
    })

    if (safetyResult.action === 'block') {
      await ctx.editMessage({
        embeds: [
          createAIErrorEmbed(
            client,
            'Sua mensagem contém conteúdo que não posso processar. Por favor, reformule sua pergunta.',
            '🛡️ Conteúdo bloqueado'
          ),
        ],
      })
      return true
    }

    if (safetyResult.action === 'warn') {
      client.logger.warn(
        `AI Safety Warning for user ${userId}: ${safetyResult.overall_risk} risk detected`
      )
    }

    return false
  }

  private async prepareConversationState(
    services: MahinaAIServices,
    userId: string,
    channelId: string,
    guildId: string,
    request: MahinaAIRequest,
    analysis: any
  ) {
    services.contextService.addMessage(userId, channelId, {
      role: 'user',
      content: request.message,
      timestamp: new Date(),
      metadata: {
        command: 'mahinai',
        emotion: analysis.emotion,
        intent: analysis.intent,
      },
    })

    services.contextService.setPersonality(userId, channelId, request.personality)

    const history = services.contextService.getConversationHistory(userId, channelId, 15)
    const memory = await services.memoryService.getUserMemory(userId, guildId)
    const insights = await services.memoryService.getUserInsights(userId, guildId)

    await services.memoryService.recordInteraction(
      userId,
      guildId,
      'mahinai',
      this.mapEmotionToSentiment(analysis.emotion)
    )

    if (analysis.topics?.length) {
      for (const topic of analysis.topics) {
        await services.memoryService.learn(userId, guildId, topic)
      }
    }

    return { history, memory, insights }
  }

  private async buildEnhancedPrompt(
    client: MahinaBot,
    message: string,
    systemPrompt: string,
    analysis: any
  ): Promise<string> {
    let enhancedPrompt = systemPrompt

    if (
      !analysis.topics?.some(
        (topic: string) =>
          topic.toLowerCase().includes('music') || topic.toLowerCase().includes('comando')
      )
    ) {
      return enhancedPrompt
    }

    const embeddingService = client.services.nvidiaEmbedding
    if (!embeddingService?.isAvailable()) {
      return enhancedPrompt
    }

    const relevantHelp = await embeddingService.searchMusicHelp(message)
    if (relevantHelp.length === 0) {
      return enhancedPrompt
    }

    enhancedPrompt += '\n\nInformações relevantes sobre comandos:\n'
    relevantHelp.forEach((result: any) => {
      enhancedPrompt += `- ${result.content}\n`
    })

    return enhancedPrompt
  }

  private async moderateOutput(
    client: MahinaBot,
    guardService: MahinaBot['services']['nvidiaGuard'],
    response: string,
    userId: string
  ): Promise<string> {
    if (!guardService?.isAvailable()) {
      return response
    }

    const moderationResult = await guardService.moderateAIResponse(response)
    if (!moderationResult.was_modified) {
      return response
    }

    client.logger.info(
      `AI response was moderated for user ${userId}. Violations: ${moderationResult.violations_found.join(', ')}`
    )

    return moderationResult.filtered_response
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
    const sentimentMap: Record<string, 'positive' | 'neutral' | 'negative'> = {
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
    const personalities: Record<string, string> = {
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
    const modeEnhancements: Record<string, string> = {
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
    prompt += `Você está conversando com ${ctx.author?.username || 'Unknown'} em ${ctx.guild?.name || 'uma DM'}.\n`

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
    const personalityInfo: Record<string, { emoji: string; color: any }> = {
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
          flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_unhelpful':
            await memoryService.recordFeedback(userId, guildId, false)
            await interaction.reply({
              content:
                '😔 Desculpe por não ter sido útil. Vou tentar melhorar! Por favor, me diga o que deu errado.',
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_regenerate':
            await interaction.reply({
              content: '🔄 Use o comando novamente com a mesma mensagem para regenerar a resposta!',
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_continue':
            await interaction.reply({
              content: '💬 Continue a conversa enviando outra mensagem com o comando!',
              flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'clear_context':
            contextService.clearContext(userId, channelId)
            await interaction.reply({
              content: '🧹 Conversation context cleared! Start fresh with your next message.',
              flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'export_chat':
            const exportData = contextService.exportContext(userId, channelId)

            await interaction.reply({
              content: '📤 Your conversation has been exported! (Feature coming soon)',
              flags: MessageFlags.Ephemeral,
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
    guildId: string,
    client: MahinaBot
  ): Promise<void> {
    // Only send suggestions for new users or specific intents
    if (memory.interactions.totalMessages > 20 && analysis.intent !== 'help') {
      return
    }

    // Wait a bit before sending suggestions
    setTimeout(async () => {
      const recommendations = await memoryService.getRecommendations(userId, guildId)

      if (analysis.intent === 'music' && ctx.guild) {
        await (ctx.channel as TextChannel)?.send({
          content: `💡 **Music Tip**: Try \`!play <song name>\` to start playing music, or \`!help music\` for all music commands!`,
        })
      } else if (memory.interactions.totalMessages === 1) {
        await (ctx.channel as TextChannel)?.send({
          content: `👋 **Welcome!** I'm Mahina AI. I can help with music, answer questions, and chat! Try different personalities with the \`personality\` option.`,
        })
      } else if (recommendations.tips.length > 0 && Math.random() < 0.3) {
        // 30% chance to show a tip
        await (ctx.channel as TextChannel)?.send({
          content: `💭 **Tip**: ${recommendations.tips[0]}`,
        })
      }
    }, 3000)
  }

  private formatIntent(intent: string): string {
    const intents: Record<string, string> = {
      help: '❓ Help Request',
      music: '🎵 Music Query',
      greeting: '👋 Greeting',
      thanks: '🙏 Appreciation',
      goodbye: '👋 Farewell',
      question: '❔ Question',
    }
    return intents[intent] || intent
  }

  private async generateAudioResponse(
    ctx: Context,
    response: string,
    personality: string,
    client: MahinaBot
  ): Promise<void> {
    try {
      const ttsService = client.services.nvidiaTTS!

      // Clean response for TTS (remove emojis and markdown)
      const cleanedResponse = ttsService.cleanTextForTTS(response)

      // Validate text length
      const validation = ttsService.validateTextLength(cleanedResponse)
      if (!validation.valid) {
        return // Skip audio if text is too long or invalid
      }

      // Choose voice based on personality
      const voiceMap: Record<string, string> = {
        friendly: 'multilingual_female_1',
        professional: 'portuguese_female_1',
        playful: 'multilingual_female_2',
        dj: 'multilingual_male_1',
        wise: 'portuguese_male_1',
        technical: 'multilingual_male_2',
        gamer: 'multilingual_male_1',
        teacher: 'portuguese_female_1',
      }

      const voice = voiceMap[personality] || 'multilingual_female_1'

      // Generate TTS
      const audioResult = await ttsService.textToSpeech(cleanedResponse, {
        voice,
        language: 'pt-BR',
        speed: personality === 'playful' ? 1.1 : personality === 'professional' ? 0.9 : 1.0,
        pitch: personality === 'playful' ? 0.1 : 0.0,
      })

      if (audioResult && audioResult.audio_data) {
        const { AttachmentBuilder } = await import('discord.js')
        const attachment = new AttachmentBuilder(audioResult.audio_data, {
          name: 'mahina_response.wav',
          description: `Resposta de áudio da Mahina AI (${personality})`,
        })

        // Send audio as follow-up message
        await (ctx.channel as TextChannel)?.send({
          content: `🎵 **Resposta em áudio** (${personality}):`,
          files: [attachment],
        })
      }
    } catch (error) {
      console.error('Failed to generate audio response:', error)
      // Fail silently - don't interrupt the main conversation flow
    }
  }
}

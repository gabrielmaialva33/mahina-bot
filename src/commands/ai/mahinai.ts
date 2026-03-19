import Command from '#common/command'
import { createAIErrorEmbed, createAILoadingEmbed } from '#common/ai_command_ui'
import { chatWithPreferredAI, getPreferredAIService } from '#common/ai_runtime'
import {
  createMahinaInteractiveComponents,
  createMahinaResponseEmbed,
  getMahinaLoadingMessage,
} from '#common/mahinai_runtime'
import type Context from '#common/context'
import { T } from '#common/i18n'
import type MahinaBot from '#common/mahina_bot'
import {
  TextChannel,
  ApplicationCommandOptionType,
  EmbedBuilder,
  Message,
  MessageFlags,
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
    const locale = ctx.guildLocale || 'PortugueseBR'
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const request = this.parseRequest(ctx, args)
    if (!request.message) {
      return await ctx.sendMessage({
        embeds: [createAIErrorEmbed(client, t('cmd.mahinai.ui.errors.missing_message'))],
        flags: MessageFlags.Ephemeral,
      })
    }

    const services = this.resolveServices(client)
    if (!services) {
      return await ctx.sendMessage({
        embeds: [
          createAIErrorEmbed(
            client,
            t('cmd.mahinai.ui.errors.services_unavailable'),
            t('cmd.mahinai.ui.errors.services_unavailable_title')
          ),
        ],
        flags: request.ephemeral ? MessageFlags.Ephemeral : undefined,
      })
    }

    await ctx.sendDeferMessage({
      embeds: [
        createAILoadingEmbed(
          client,
          `${getMahinaLoadingMessage(t)} ${t('cmd.mahinai.ui.loading_suffix')}`
        ),
      ],
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
        client,
        t
      )
      const components = this.createInteractiveComponents(conversationState.insights, t)

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
          locale,
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
        locale,
        client
      )
    } catch (error) {
      console.error('MahinaAI error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: t('cmd.mahinai.ui.errors.generic_title'),
            description: t('cmd.mahinai.ui.errors.generic'),
            fields: [
              {
                name: t('cmd.mahinai.ui.errors.error_field'),
                value: (error as Error).message || t('cmd.mahinai.ui.errors.unknown_error'),
                inline: false,
              },
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
    client: MahinaBot,
    translate: (key: string, params?: Record<string, unknown>) => string
  ): EmbedBuilder {
    return createMahinaResponseEmbed({
      response,
      personality,
      mode,
      analysis,
      insights,
      client,
      translate,
    })
  }

  private createInteractiveComponents(
    insights: any,
    translate: (key: string, params?: Record<string, unknown>) => string
  ) {
    return createMahinaInteractiveComponents(insights, translate)
  }

  private async handleInteractions(
    message: Message,
    userId: string,
    channelId: string,
    guildId: string,
    locale: string,
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
          content: T(locale, 'cmd.mahinai.ui.interactions.original_user_only'),
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
              content: T(locale, 'cmd.mahinai.ui.interactions.helpful'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_unhelpful':
            await memoryService.recordFeedback(userId, guildId, false)
            await interaction.reply({
              content: T(locale, 'cmd.mahinai.ui.interactions.unhelpful'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_regenerate':
            await interaction.reply({
              content: T(locale, 'cmd.mahinai.ui.interactions.regenerate'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_continue':
            await interaction.reply({
              content: T(locale, 'cmd.mahinai.ui.interactions.continue'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'ai_settings':
            const settingsEmbed = new EmbedBuilder()
              .setTitle(T(locale, 'cmd.mahinai.ui.settings.title'))
              .setColor(client.config.color.main)
              .setDescription(T(locale, 'cmd.mahinai.ui.settings.description'))
              .addFields(
                {
                  name: T(locale, 'cmd.mahinai.ui.settings.change_model'),
                  value: T(locale, 'cmd.mahinai.ui.settings.change_model_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.settings.view_models'),
                  value: T(locale, 'cmd.mahinai.ui.settings.view_models_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.settings.clear_history'),
                  value: T(locale, 'cmd.mahinai.ui.settings.clear_history_value'),
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
              .setTitle(T(locale, 'cmd.mahinai.ui.personality.title'))
              .setColor(client.config.color.violet)
              .setDescription(T(locale, 'cmd.mahinai.ui.personality.description'))
              .addFields(
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.friendly'),
                  value: T(locale, 'cmd.mahinai.ui.personality.friendly_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.professional'),
                  value: T(locale, 'cmd.mahinai.ui.personality.professional_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.playful'),
                  value: T(locale, 'cmd.mahinai.ui.personality.playful_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.dj'),
                  value: T(locale, 'cmd.mahinai.ui.personality.dj_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.wise'),
                  value: T(locale, 'cmd.mahinai.ui.personality.wise_value'),
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.personality.technical'),
                  value: T(locale, 'cmd.mahinai.ui.personality.technical_value'),
                  inline: true,
                }
              )
              .setFooter({ text: T(locale, 'cmd.mahinai.ui.personality.footer') })

            await interaction.reply({
              embeds: [personalityEmbed],
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'clear_context':
            contextService.clearContext(userId, channelId)
            await interaction.reply({
              content: T(locale, 'cmd.mahinai.ui.interactions.clear_context'),
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'view_stats':
            const stats = contextService.getStats()
            const insights = await memoryService.getUserInsights(userId, guildId)

            const statsEmbed = new EmbedBuilder()
              .setTitle(T(locale, 'cmd.mahinai.ui.stats.title'))
              .setColor(client.config.color.blue)
              .addFields(
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.total_conversations'),
                  value: `${stats.totalContexts}`,
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.total_messages'),
                  value: `${stats.totalMessages}`,
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.helpfulness'),
                  value: `${Math.round(insights.helpfulnessRate * 100)}%`,
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.favorite_commands'),
                  value:
                    insights.topCommands.join(', ') || T(locale, 'cmd.mahinai.ui.stats.none_yet'),
                  inline: false,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.sentiment'),
                  value: insights.sentiment,
                  inline: true,
                },
                {
                  name: T(locale, 'cmd.mahinai.ui.stats.personality'),
                  value: insights.personality,
                  inline: true,
                }
              )

            await interaction.reply({
              embeds: [statsEmbed],
              flags: MessageFlags.Ephemeral,
            })
            break

          case 'get_recommendations':
            const recommendations = await memoryService.getRecommendations(userId, guildId)

            const recEmbed = new EmbedBuilder()
              .setTitle(T(locale, 'cmd.mahinai.ui.recommendations.title'))
              .setColor(client.config.color.yellow)

            if (recommendations.music.length > 0) {
              recEmbed.addFields({
                name: T(locale, 'cmd.mahinai.ui.recommendations.music'),
                value: recommendations.music.join('\n'),
                inline: false,
              })
            }

            if (recommendations.commands.length > 0) {
              recEmbed.addFields({
                name: T(locale, 'cmd.mahinai.ui.recommendations.commands'),
                value: recommendations.commands.join('\n'),
                inline: false,
              })
            }

            if (recommendations.tips.length > 0) {
              recEmbed.addFields({
                name: T(locale, 'cmd.mahinai.ui.recommendations.tips'),
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
            contextService.exportContext(userId, channelId)

            await interaction.reply({
              content: T(locale, 'cmd.mahinai.ui.interactions.export_chat'),
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
    locale: string,
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
          content: T(locale, 'cmd.mahinai.ui.follow_up.music_tip'),
        })
      } else if (memory.interactions.totalMessages === 1) {
        await (ctx.channel as TextChannel)?.send({
          content: T(locale, 'cmd.mahinai.ui.follow_up.welcome'),
        })
      } else if (recommendations.tips.length > 0 && Math.random() < 0.3) {
        // 30% chance to show a tip
        await (ctx.channel as TextChannel)?.send({
          content: T(locale, 'cmd.mahinai.ui.follow_up.tip', { tip: recommendations.tips[0] }),
        })
      }
    }, 3000)
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

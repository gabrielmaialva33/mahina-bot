import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js'
import Event from '#common/event'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'
import type { ChatMessage } from '#src/services/ai_service'
import type { MahinaBrain } from '#src/services/mahina_brain'

const THINK_TIMEOUT = 30_000 // 30 seconds max

const thinkWithTimeout = <T>(promise: Promise<T>): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Think timeout')), THINK_TIMEOUT)
    ),
  ])
}

export default class AIMention extends Event {
  private personalityCache: Map<string, string> = new Map()

  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'aiMention',
    })
  }

  private get brain(): MahinaBrain | undefined {
    return this.client.services.brain
  }

  private async getUserPersonality(userId: string, guildId: string): Promise<string> {
    const key = `${userId}-${guildId}`
    if (this.personalityCache.has(key)) return this.personalityCache.get(key)!

    // Load from memory service
    const memory = this.client.services.aiMemory
    if (memory) {
      const userMem = await memory.getUserMemory(userId, guildId)
      if (userMem.preferences.aiPersonality) {
        this.personalityCache.set(key, userMem.preferences.aiPersonality)
        return userMem.preferences.aiPersonality
      }
    }

    const aiConfig = await this.client.db.getAIConfig(guildId)
    return aiConfig.defaultPersonality || 'humor_negro'
  }

  private async setUserPersonality(
    userId: string,
    guildId: string,
    personality: string
  ): Promise<void> {
    this.personalityCache.set(`${userId}-${guildId}`, personality)
    const memory = this.client.services.aiMemory
    if (memory) {
      await memory.updatePreferences(userId, guildId, { aiPersonality: personality })
    }
  }

  async run(message: Message): Promise<void> {
    try {
      if (!this.brain || !this.brain.isAvailable()) return

      const aiConfig = await this.client.db.getAIConfig(message.guildId!)
      if (!aiConfig.enabled) return

      if (
        aiConfig.allowedChannels.length > 0 &&
        !aiConfig.allowedChannels.includes(message.channelId)
      ) {
        return
      }

      if (aiConfig.blockedUsers.includes(message.author.id)) return

      if (!this.brain.checkRateLimit(message.author.id, message.guildId!, aiConfig.rateLimit)) {
        return await message.reply({
          content: 'calma aí mano, tá metralhando mensagem. espera uns segundos 💀',
        })
      }

      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping()
      }

      const userPersonality = await this.getUserPersonality(message.author.id, message.guildId!)

      // Load chat history
      const chatHistory = await this.client.db.getChatHistory(message.channelId)
      const historyMessages: ChatMessage[] = chatHistory?.messages
        ? Array.isArray(chatHistory.messages)
          ? (chatHistory.messages as unknown as ChatMessage[])
          : []
        : []

      // Strip bot mentions
      let cleanContent = message.content
        .replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '')
        .replace(/mahina/gi, '')
        .trim()

      if (!cleanContent) cleanContent = 'Olá!'

      // Build conversation context
      const recentHistory = historyMessages
        .slice(-aiConfig.contextWindow)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        .filter((m) => m.role !== 'system')

      recentHistory.push({ role: 'user' as const, content: cleanContent })

      const guildName = message.guild?.name ?? 'Server Desconhecido'
      const channelName = 'name' in message.channel ? message.channel.name || 'geral' : 'geral'
      const learnedServerContext = await this.client.services.serverLearning?.getPromptContext(
        message.guildId!,
        message.channelId,
        message.author.id
      )
      const willContext = await this.client.services.mahinaWill?.getPromptContext(
        message.guildId!,
        message.channelId
      )
      const awarenessContext = this.client.services.serverAwareness?.getPromptContext(
        message.guildId!,
        message.channelId,
        message.author.id
      )
      const runtimeContext = this.buildServerRuntimeContext(message, cleanContent)

      // Analyze image attachments if present
      let imageContext: string | undefined
      const imageAttachment = message.attachments.find(
        (a) =>
          a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || '')
      )
      if (imageAttachment && this.client.services.nvidiaMultimodal) {
        try {
          const analysis = await this.client.services.nvidiaMultimodal.analyzeImage(
            imageAttachment.url,
            cleanContent || 'Describe this image'
          )
          if (analysis) imageContext = `[User sent an image: ${analysis}]`
        } catch {
          /* ignore */
        }
      }

      // Streaming: send placeholder, edit as chunks arrive
      let reply: Message | null = null

      const response = await thinkWithTimeout(
        this.brain.think(
          recentHistory,
          message.author.id,
          message.guildId!,
          channelName,
          message.author.username,
          guildName,
          userPersonality,
          {
            onStart: async (content) => {
              reply = await message.reply({ content: content + ' ▌' }).catch(() => null)
            },
            onUpdate: async (content) => {
              if (reply) {
                await reply.edit({ content: content + ' ▌' }).catch(() => {})
              }
            },
            onEnd: async (content) => {
              // Final edit with buttons — remove cursor
              const buttons = this.buildButtons()
              if (reply) {
                await reply.edit({ content, components: [buttons] }).catch(() => {})
              } else {
                // Fallback if streaming never started
                reply = await message.reply({ content, components: [buttons] }).catch(() => null)
              }
            },
          },
          imageContext,
          [runtimeContext, awarenessContext, learnedServerContext, willContext]
            .filter(Boolean)
            .join('\n\n') || undefined
        )
      )

      // If streaming callbacks never fired (non-streaming fallback)
      if (!reply) {
        const buttons = this.buildButtons()
        reply = await message.reply({ content: response, components: [buttons] }).catch(() => null)
      }

      // Persist chat history
      const userMsg: ChatMessage = { role: 'user', content: cleanContent, timestamp: Date.now() }
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      await this.client.db.updateChatHistory(
        message.channelId,
        message.author.id,
        message.guildId!,
        [userMsg, assistantMsg],
        aiConfig.maxHistory
      )

      await this.client.db.updateAIStats(message.guildId!, message.channelId, message.author.id)
      await this.client.services.mahinaWill?.markSpoke(message.guildId!, message.channelId)

      // Collect button interactions
      this.setupCollector(reply, message, userPersonality)
    } catch (error: unknown) {
      logger.error('AI mention failed', {
        userId: message.author.id,
        guildId: message.guildId,
        error: (error as Error).message,
      })
      await message
        .reply({
          content: 'deu ruim aqui nos meus circuitos. tenta dnv 💀',
        })
        .catch(() => {})
    }
  }

  private buildServerRuntimeContext(message: Message, cleanContent: string): string {
    if (!message.guild) return ''

    const parts: string[] = ['ESTADO RUNTIME DO SERVER AGORA:']
    const textChannelName = 'name' in message.channel ? message.channel.name : message.channelId
    // voice.channel on message.member can be stale; voiceStates.cache is the
    // authoritative source maintained by GUILD_VOICE_STATES intent
    const authoritativeVoiceState = message.guild.voiceStates.cache.get(message.author.id)
    const memberVoice = authoritativeVoiceState?.channel ?? message.member?.voice.channel ?? null
    const botVoice =
      message.guild.members.me?.voice.channel ??
      message.guild.voiceStates.cache.get(this.client.user?.id ?? '')?.channel ??
      null
    const player = this.client.manager?.getPlayer(message.guildId!)
    const normalizedMessage = this.normalizeForContext(cleanContent)

    parts.push(`- canal de texto desta mensagem: #${textChannelName} (${message.channelId})`)

    if (memberVoice) {
      const humans = memberVoice.members.filter((member) => !member.user.bot).size
      parts.push(
        `- ${message.member?.displayName || message.author.username} está AGORA no canal de voz "${memberVoice.name}" (<#${memberVoice.id}>), com ${humans} humano(s)`
      )
    } else {
      parts.push(
        `- ${message.member?.displayName || message.author.username} NÃO está em canal de voz agora`
      )
    }

    if (botVoice) {
      parts.push(`- Mahina está AGORA no canal de voz "${botVoice.name}" (<#${botVoice.id}>)`)
    } else {
      parts.push('- Mahina NÃO está conectada em canal de voz agora')
    }

    if (player) {
      const playerVoiceName = player.voiceChannelId
        ? message.guild.channels.cache.get(player.voiceChannelId)?.name
        : undefined
      const currentTrack = player.queue.current
      parts.push(
        [
          '- player Lavalink:',
          playerVoiceName ? `voz="${playerVoiceName}"` : 'sem canal de voz',
          player.playing ? 'tocando' : player.paused ? 'pausado' : 'parado',
          currentTrack ? `música="${currentTrack.info.title}"` : 'sem música atual',
        ].join(' ')
      )
    } else {
      parts.push('- player Lavalink: nenhum player ativo neste server')
    }

    const mentionedVoiceChannels = message.guild.channels.cache
      .filter(
        (channel) =>
          channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice
      )
      .filter((channel) => {
        const normalizedName = this.normalizeForContext(channel.name)
        return normalizedName.length > 0 && normalizedMessage.includes(normalizedName)
      })
      .map((channel) => `"${channel.name}" (<#${channel.id}>)`)
      .slice(0, 4)

    if (mentionedVoiceChannels.length > 0) {
      parts.push(
        `- a mensagem menciona nome de canal de voz existente: ${mentionedVoiceChannels.join(', ')}`
      )
    }

    parts.push(
      '- ESSE bloco é VERDADE ABSOLUTA sobre presença em voz; NUNCA contradiga (ex: nunca acuse o user de estar fora de voz se este bloco diz que está dentro, e vice-versa). Se o user pediu música/play e este bloco diz que ele NÃO está em voz, peça pra entrar — caso contrário não invente que ele saiu.'
    )

    return parts.join('\n')
  }

  private normalizeForContext(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private buildButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ai_memory')
        .setLabel('Memória')
        .setEmoji('🧠')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_personality')
        .setLabel('Personalidade')
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_new_chat')
        .setLabel('Nova Conversa')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
    )
  }

  private setupCollector(reply: Message, message: Message, userPersonality: string): void {
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    })

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'isso não é pra você, intrometido 💀',
          flags: MessageFlags.Ephemeral,
        })
      }

      switch (interaction.customId) {
        case 'ai_memory': {
          const brainDump = await this.brain!.getUserBrainDump(message.author.id, message.guildId!)
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(this.client.config.color.main)
                .setTitle(`🧠 O que eu sei sobre ${message.author.username}`)
                .setDescription(brainDump)
                .setFooter({ text: 'Mahina Memory System' }),
            ],
            flags: MessageFlags.Ephemeral,
          })
          break
        }

        case 'ai_personality': {
          const personalities = this.brain!.getPersonalities()
          const options = Object.entries(personalities).map(([key, p]) => ({
            label: p.name,
            description: key === 'humor_negro' ? 'Personalidade padrão' : `Overlay: ${key}`,
            value: key,
            emoji: p.emoji,
          }))

          const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('ai_personality_select')
              .setPlaceholder('Escolha uma personalidade')
              .addOptions(options)
          )

          const personalityEmbed = new EmbedBuilder()
            .setColor(this.client.config.color.main)
            .setTitle('🎭 Personalidades da Mahina')
            .setDescription('A base é sempre a mesma — só muda o tom.')
            .setFooter({ text: `Atual: ${userPersonality}` })

          for (const p of Object.values(personalities)) {
            personalityEmbed.addFields({
              name: `${p.emoji} ${p.name}`,
              value: p.overlay || 'Identidade core — sem filtro',
              inline: true,
            })
          }

          await interaction.reply({
            embeds: [personalityEmbed],
            components: [selectMenu],
            flags: MessageFlags.Ephemeral,
          })

          const selectCollector = interaction.channel?.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60_000,
            filter: (i) =>
              i.customId === 'ai_personality_select' && i.user.id === message.author.id,
          })

          selectCollector?.on('collect', async (selectInteraction) => {
            const selected = selectInteraction.values[0]
            await this.setUserPersonality(message.author.id, message.guildId!, selected)
            const selectedP = this.brain!.getPersonality(selected)
            await selectInteraction.update({
              content: `${selectedP?.emoji} personalidade trocada pra **${selectedP?.name}**`,
              embeds: [],
              components: [],
            })
          })
          break
        }

        case 'ai_new_chat': {
          await this.client.db.clearChatHistory(message.channelId)
          await interaction.reply({
            content: 'zerou. esqueci tudo que rolou aqui 🧹',
            flags: MessageFlags.Ephemeral,
          })
          break
        }
      }
    })
  }
}

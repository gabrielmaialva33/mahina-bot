import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import type { ChatMessage } from '#src/services/ai_service'
import type { MahinaBrain } from '#src/services/mahina_brain'

export default class AIMention extends Event {
  private userPersonalities: Map<string, string> = new Map()

  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'aiMention',
    })
  }

  private get brain(): MahinaBrain | undefined {
    return this.client.services.brain
  }

  async run(message: Message): Promise<any> {
    try {
      // Check if brain is available
      if (!this.brain || !this.brain.isAvailable()) {
        return
      }

      // Get AI config for guild
      const aiConfig = await this.client.db.getAIConfig(message.guildId!)

      // Check if AI is enabled
      if (!aiConfig.enabled) return

      // Check if channel is allowed
      if (
        aiConfig.allowedChannels.length > 0 &&
        !aiConfig.allowedChannels.includes(message.channelId)
      ) {
        return
      }

      // Check if user is blocked
      if (aiConfig.blockedUsers.includes(message.author.id)) return

      // Check rate limit
      if (!this.brain.checkRateLimit(message.author.id, aiConfig.rateLimit)) {
        return await message.reply({
          content: 'calma aí mano, tá metralhando mensagem. espera uns segundos 💀',
        })
      }

      // Start typing
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping()
      }

      // Get user personality preference or guild default
      const userPersonality =
        this.userPersonalities.get(message.author.id) ||
        aiConfig.defaultPersonality ||
        'humor_negro'

      // Get chat history from database
      const chatHistory = await this.client.db.getChatHistory(message.channelId)
      const historyMessages: ChatMessage[] = chatHistory?.messages
        ? Array.isArray(chatHistory.messages)
          ? (chatHistory.messages as unknown as ChatMessage[])
          : []
        : []

      // Clean message content — remove bot mentions
      let cleanContent = message.content
        .replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '')
        .replace(/mahina/gi, '')
        .trim()

      if (!cleanContent) {
        cleanContent = 'Olá!'
      }

      // Build messages array for the brain (use context window from config)
      const recentHistory = historyMessages
        .slice(-aiConfig.contextWindow)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        .filter((m) => m.role !== 'system')

      // Add current message
      recentHistory.push({ role: 'user' as const, content: cleanContent })

      // Get guild name
      const guildName = message.guild?.name ?? 'Server Desconhecido'
      const channelName = 'name' in message.channel ? message.channel.name || 'geral' : 'geral'

      // Think!
      const response = await this.brain.think(
        recentHistory,
        message.author.id,
        message.guildId!,
        channelName,
        message.author.username,
        guildName,
        userPersonality
      )

      // Buttons — minimal, natural
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
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

      // Reply naturally — text, not embed
      const reply = await message.reply({
        content: response,
        components: [buttons],
      })

      // Save to chat history
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

      // Update stats
      await this.client.db.updateAIStats(message.guildId!, message.channelId, message.author.id)

      // Handle button interactions
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
            const brainDump = await this.brain!.getUserBrainDump(
              message.author.id,
              message.guildId!
            )
            const embed = new EmbedBuilder()
              .setColor(this.client.config.color.main)
              .setTitle(`🧠 O que eu sei sobre ${message.author.username}`)
              .setDescription(brainDump)
              .setFooter({ text: 'Mahina Memory System' })

            await interaction.reply({
              embeds: [embed],
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

            for (const [key, p] of Object.entries(personalities)) {
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
              this.userPersonalities.set(message.author.id, selected)

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
    } catch (error: any) {
      console.error('AI Mention Error:', error)
      await message.reply({
        content: 'deu ruim aqui nos meus circuitos. tenta dnv 💀',
      })
    }
  }
}

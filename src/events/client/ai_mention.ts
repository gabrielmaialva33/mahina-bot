import {
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
} from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import { AIService, type ChatMessage } from '#src/services/ai_service'

export default class AIMention extends Event {
  private aiService: AIService
  private userPersonalities: Map<string, string> = new Map()

  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'aiMention',
    })
    this.aiService = new AIService(client)
  }

  async run(message: Message): Promise<any> {
    try {
      // Get AI config for guild
      const aiConfig = await this.client.db.getAIConfig(message.guildId!)

      // Check if AI is enabled
      if (!aiConfig.enabled) {
        return
      }

      // Check if channel is allowed
      if (
        aiConfig.allowedChannels.length > 0 &&
        !aiConfig.allowedChannels.includes(message.channelId)
      ) {
        return
      }

      // Check if user is blocked
      if (aiConfig.blockedUsers.includes(message.author.id)) {
        return
      }

      // Check rate limit with custom limit
      if (!this.aiService.checkRateLimit(message.author.id, aiConfig.rateLimit)) {
        const rateLimitEmbed = this.aiService.createRateLimitEmbed(60)
        return await message.reply({ embeds: [rateLimitEmbed] })
      }

      // Start typing indicator
      await message.channel.sendTyping()

      // Get user's personality preference or guild default
      const userPersonality =
        this.userPersonalities.get(message.author.id) || aiConfig.defaultPersonality

      // Get chat history from database
      const chatHistory = await this.client.db.getChatHistory(message.channelId)
      let messages: ChatMessage[] = (chatHistory?.messages as ChatMessage[]) || []

      // Add current message to history
      const userMessage: ChatMessage = {
        role: 'user',
        content: message.content,
        timestamp: Date.now(),
      }
      messages.push(userMessage)

      // Generate AI response with personality and context
      const response = await this.aiService.generateResponse(
        messages.slice(-aiConfig.contextWindow), // Use configured context window
        message.author.username,
        message.channel.name || 'geral',
        userPersonality,
        message.guildId!
      )

      // Create buttons for interactions
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ai_personality')
          .setLabel('Personalidade')
          .setEmoji('🎭')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ai_new_chat')
          .setLabel('Nova Conversa')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ai_stats')
          .setLabel('Estatísticas')
          .setEmoji('📊')
          .setStyle(ButtonStyle.Secondary)
      )

      // Send response with buttons
      const reply = await message.reply({
        content: response,
        components: [buttons],
      })

      // Update chat history with AI response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }

      await this.client.db.updateChatHistory(
        message.channelId,
        message.author.id,
        message.guildId!,
        [userMessage, assistantMessage],
        aiConfig.maxHistory // Use configured max history
      )

      // Update stats
      await this.client.db.updateAIStats(message.guildId!, message.channelId, message.author.id)

      // Add reactions for quick feedback
      await reply.react('👍')
      await reply.react('👎')

      // Handle button interactions
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000, // 2 minutes
      })

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: 'Apenas o autor da mensagem pode usar esses botões!',
            ephemeral: true,
          })
        }

        switch (interaction.customId) {
          case 'ai_personality':
            // Create personality selector
            const personalities = this.aiService.getPersonalities()
            const options = Array.from(personalities.entries()).map(([key, personality]) => ({
              label: personality.name,
              description: personality.description,
              value: key,
              emoji: personality.emoji,
            }))

            const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('ai_personality_select')
                .setPlaceholder('Escolha uma personalidade')
                .addOptions(options)
            )

            await interaction.reply({
              embeds: [this.aiService.createPersonalityEmbed(personalities, userPersonality)],
              components: [selectMenu],
              ephemeral: true,
            })

            // Handle personality selection
            const selectCollector = interaction.channel?.createMessageComponentCollector({
              componentType: ComponentType.StringSelect,
              time: 60000,
              filter: (i) =>
                i.customId === 'ai_personality_select' && i.user.id === message.author.id,
            })

            selectCollector?.on('collect', async (selectInteraction) => {
              const selected = selectInteraction.values[0]
              this.userPersonalities.set(message.author.id, selected)

              const selectedPersonality = this.aiService.getPersonality(selected)!
              await selectInteraction.update({
                content: `${selectedPersonality.emoji} Personalidade alterada para: **${selectedPersonality.name}**`,
                embeds: [],
                components: [],
              })
            })
            break

          case 'ai_new_chat':
            await this.client.db.clearChatHistory(message.channelId)
            await interaction.reply({
              content: '✨ Nova conversa iniciada! A memória anterior foi limpa.',
              ephemeral: true,
            })
            break

          case 'ai_stats':
            // Get conversation stats
            const history = await this.client.db.getChatHistory(message.channelId)
            const messageCount = (history?.messages as ChatMessage[])?.length || 0
            const userMessages =
              (history?.messages as ChatMessage[])?.filter((m) => m.role === 'user').length || 0
            const aiMessages =
              (history?.messages as ChatMessage[])?.filter((m) => m.role === 'assistant').length ||
              0

            await interaction.reply({
              content:
                `📊 **Estatísticas da Conversa**\n` +
                `Total de mensagens: ${messageCount}\n` +
                `Suas mensagens: ${userMessages}\n` +
                `Respostas da Mahina: ${aiMessages}\n` +
                `Personalidade atual: ${this.aiService.getPersonality(userPersonality)?.name}`,
              ephemeral: true,
            })
            break
        }
      })
    } catch (error: any) {
      console.error('AI Mention Error:', error)

      // Send error message
      const errorEmbed = this.aiService.createErrorEmbed(
        error.message || 'Ocorreu um erro ao processar sua mensagem.'
      )

      await message.reply({ embeds: [errorEmbed] })
    }
  }
}

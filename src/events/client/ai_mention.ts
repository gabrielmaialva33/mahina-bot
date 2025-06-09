import { Message } from 'discord.js'
import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import { AIService, type ChatMessage } from '#src/services/ai_service'

export default class AIMention extends Event {
  private aiService: AIService

  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'aiMention',
    })
    this.aiService = new AIService(client)
  }

  async run(message: Message): Promise<any> {
    try {
      // Start typing indicator
      await message.channel.sendTyping()

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

      // Generate AI response
      const response = await this.aiService.generateResponse(
        messages.slice(-10), // Keep last 10 messages for context
        message.author.username,
        message.channel.name || 'geral'
      )

      // Send response
      const reply = await message.reply(response)

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
        30 // Keep last 30 messages in history
      )

      // Add reactions for feedback
      await reply.react('👍')
      await reply.react('👎')
      await reply.react('🔄') // For new conversation

      // Handle reaction collector for special actions
      const filter = (reaction: any, user: any) => {
        return ['👍', '👎', '🔄'].includes(reaction.emoji.name) && user.id === message.author.id
      }

      const collector = reply.createReactionCollector({ filter, time: 60000 })

      collector.on('collect', async (reaction, user) => {
        if (reaction.emoji.name === '🔄') {
          // Clear conversation history
          await this.client.db.clearChatHistory(message.channelId)
          await message.channel.send('✨ Nova conversa iniciada! A memória anterior foi limpa.')
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

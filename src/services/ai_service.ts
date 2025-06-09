import OpenAI from 'openai'
import { EmbedBuilder } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export class AIService {
  private openai: OpenAI
  private client: MahinaBot

  constructor(client: MahinaBot) {
    this.client = client
    this.openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.NVIDIA_API_KEY ? 'https://integrate.api.nvidia.com/v1' : undefined,
    })
  }

  async generateResponse(
    messages: ChatMessage[],
    userName: string,
    channelName: string
  ): Promise<string> {
    try {
      // Build system prompt
      const systemPrompt = `Você é Mahina, uma assistente musical inteligente e amigável do Discord. 
      Você está conversando com ${userName} no canal ${channelName}.
      Seja prestativa, divertida e casual. Use emojis ocasionalmente.
      Mantenha suas respostas concisas mas informativas.
      Se perguntarem sobre música, você pode sugerir usar seus comandos de música.
      Você tem memória das conversas anteriores neste canal.`

      // Prepare messages for API
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ]

      // Call AI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.NVIDIA_API_KEY ? 'meta/llama-3.1-405b-instruct' : 'gpt-3.5-turbo',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      })

      return (
        completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.'
      )
    } catch (error) {
      console.error('AI Service Error:', error)
      throw error
    }
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
      .setDescription('💭 **Mahina está pensando...**')
  }
}

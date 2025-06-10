import { Command, type Context, type MahinaBot } from '#common/index'
import { ApplicationCommandOptionType } from 'discord.js'

export default class Stream extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'stream',
      description: {
        content: 'cmd.stream.description',
        examples: ['stream Tell me a story', 'stream Explain quantum computing'],
        usage: 'stream <message>',
      },
      category: 'ai',
      aliases: ['aistream', 'streamchat'],
      cooldown: 5,
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
          name: 'message',
          description: 'Your message for streaming AI response',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const message = ctx.interaction?.options.getString('message') || args.join(' ')
    const nvidiaService = client.services.nvidia

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ NVIDIA AI service is not configured',
            color: 0xff0000,
          },
        ],
      })
    }

    if (!message) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Please provide a message',
            color: 0xff0000,
          },
        ],
      })
    }

    // Check if current model supports streaming
    const modelKey = nvidiaService.getUserModel(ctx.author.id)
    const model = nvidiaService.getModelInfo(modelKey)

    if (!model?.streaming) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: `❌ Your current model **${model?.name || 'Unknown'}** does not support streaming.\n\nSwitch to a streaming-enabled model with \`/model select llama-70b-stream\``,
            color: 0xff0000,
          },
        ],
      })
    }

    await ctx.sendDeferMessage('🤖 Generating streaming response...')

    try {
      const chunks: string[] = []
      let currentMessage = ''
      let lastUpdate = Date.now()
      let messagesSent = 0
      const updateInterval = 1500 // Update every 1.5 seconds
      const maxLength = 1900 // Leave room for formatting

      for await (const chunk of nvidiaService.chatStream(ctx.author.id, message)) {
        chunks.push(chunk)
        currentMessage += chunk

        // Update message periodically or when reaching length limit
        const shouldUpdate =
          Date.now() - lastUpdate > updateInterval || currentMessage.length > maxLength

        if (shouldUpdate && currentMessage.trim()) {
          if (messagesSent === 0) {
            // First update - edit the deferred message
            await ctx.editMessage({
              content:
                currentMessage.slice(0, maxLength) +
                (currentMessage.length > maxLength ? '...' : ''),
            })
          } else {
            // Subsequent updates - send new messages
            await ctx.sendMessage({
              content:
                currentMessage.slice(0, maxLength) +
                (currentMessage.length > maxLength ? '...' : ''),
            })
            currentMessage = currentMessage.slice(maxLength)
          }

          messagesSent++
          lastUpdate = Date.now()
        }
      }

      // Send final message with remaining content
      if (currentMessage.trim()) {
        if (messagesSent === 0) {
          await ctx.editMessage({
            content: currentMessage,
          })
        } else {
          await ctx.sendMessage({
            content: currentMessage,
          })
        }
      }

      // Send completion embed
      await ctx.sendMessage({
        embeds: [
          {
            title: '✅ Stream Complete',
            fields: [
              { name: 'Model', value: model.name, inline: true },
              { name: 'Tokens Generated', value: `~${chunks.length}`, inline: true },
            ],
            color: 0x76b900,
            timestamp: new Date().toISOString(),
          },
        ],
      })
    } catch (error) {
      console.error('Stream error:', error)
      await ctx.editMessage({
        embeds: [
          {
            description: '❌ An error occurred while streaming the response',
            color: 0xff0000,
          },
        ],
      })
    }
  }
}

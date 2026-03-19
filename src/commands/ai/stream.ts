import Command from '#common/command'
import { createAIModelStatusEmbed, resolveAIServiceForCapability } from '#common/ai_runtime'
import { createStreamCompletionEmbed } from '#common/stream_ai_runtime'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
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
      player: undefined,
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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const message = ctx.isInteraction
      ? (ctx.options.get('message')?.value as string)
      : args.join(' ')
    const aiService = resolveAIServiceForCapability(client, 'stream')

    if (!aiService?.chatStream || !aiService.getUserModel || !aiService.getModelInfo) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.stream.ui.errors.service_unavailable'),
            color: 0xff0000,
          },
        ],
      })
    }

    if (!message) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.stream.ui.errors.missing_message'),
            color: 0xff0000,
          },
        ],
      })
    }

    // Check if current model supports streaming
    const modelKey = aiService.getUserModel(ctx.author!.id)
    const model = aiService.getModelInfo(modelKey)

    if (!model?.streaming) {
      const currentModelEmbed = createAIModelStatusEmbed(client, ctx.author!.id)
      return await ctx.sendMessage({
        content: currentModelEmbed ? undefined : null,
        embeds: [
          {
            description: t('cmd.stream.ui.errors.streaming_unsupported', {
              model: model?.name || t('cmd.stream.ui.unknown_model'),
            }),
            color: 0xff0000,
          },
          ...(currentModelEmbed ? [currentModelEmbed.toJSON()] : []),
        ],
      })
    }

    await ctx.sendDeferMessage(t('cmd.stream.ui.loading'))

    try {
      const chunks: string[] = []
      let currentMessage = ''
      let lastUpdate = Date.now()
      let messagesSent = 0
      const updateInterval = 1500 // Update every 1.5 seconds
      const maxLength = 1900 // Leave room for formatting

      for await (const chunk of aiService.chatStream(ctx.author!.id, message)) {
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
        embeds: [createStreamCompletionEmbed(t, model.name, chunks.length)],
      })
    } catch (error) {
      console.error('Stream error:', error)
      await ctx.editMessage({
        embeds: [
          {
            description: t('cmd.stream.ui.errors.generic'),
            color: 0xff0000,
          },
        ],
      })
    }
  }
}

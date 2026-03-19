import Command from '#common/command'
import {
  createAIErrorEmbed,
  createAILoadingEmbed,
  createAIResultEmbed,
  splitDiscordMessage,
} from '#common/ai_command_ui'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { ApplicationCommandOptionType } from 'discord.js'

export default class Reason extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'reason',
      description: {
        content: 'cmd.reason.description',
        examples: [
          'reason How can I optimize database queries?',
          'reason Explain the traveling salesman problem and solutions',
        ],
        usage: 'reason <problem>',
      },
      category: 'ai',
      aliases: ['aireason', 'solve', 'analyze'],
      cooldown: 10,
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
          name: 'problem',
          description: 'The problem or question to analyze',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'context',
          description: 'Additional context for the problem',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const nvidiaService = client.services.nvidia

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [createAIErrorEmbed(client, 'NVIDIA AI service is not configured')],
      })
    }

    let problem: string
    let context: string | undefined

    if (ctx.isInteraction) {
      problem = ctx.options.get('problem')?.value as string
      context = (ctx.options.get('context')?.value as string) || undefined
    } else {
      problem = args.join(' ')
      context = undefined
    }

    if (!problem) {
      return await ctx.sendMessage({
        embeds: [createAIErrorEmbed(client, 'Please provide a problem or question to analyze')],
      })
    }

    await ctx.sendDeferMessage({
      embeds: [
        createAILoadingEmbed(client, '🧠 Analyzing your problem with advanced reasoning...'),
      ],
    })

    try {
      const response = await nvidiaService.reasoning(ctx.author!.id, problem, context)

      // Split response if too long
      const chunks = splitDiscordMessage(response)

      if (chunks.length <= 3) {
        // Send as multiple messages if fits within 3 messages
        await ctx.editMessage({
          embeds: [
            createAIResultEmbed(client, '🧠 Analysis Result', chunks[0], [
              { name: 'Model', value: 'DeepSeek R1', inline: true },
              { name: 'Type', value: 'Advanced Reasoning', inline: true },
            ]),
          ],
        })

        // Send remaining chunks
        for (let i = 1; i < chunks.length; i++) {
          await ctx.sendMessage({
            content: chunks[i],
          })
        }
      } else {
        // If response is very long, truncate and inform user
        await ctx.editMessage({
          embeds: [
            createAIResultEmbed(
              client,
              '🧠 Analysis Result',
              chunks[0] + '\n\n...(response truncated)',
              [
                { name: 'Model', value: 'DeepSeek R1', inline: true },
                { name: 'Response Length', value: `${response.length} characters`, inline: true },
                {
                  name: 'Note',
                  value: 'Response was too long and has been truncated',
                  inline: false,
                },
              ]
            ),
          ],
        })
      }
    } catch (error) {
      console.error('Reasoning error:', error)
      await ctx.editMessage({
        embeds: [
          createAIErrorEmbed(client, `Failed to analyze problem: ${(error as Error).message}`),
        ],
      })
    }
  }
}

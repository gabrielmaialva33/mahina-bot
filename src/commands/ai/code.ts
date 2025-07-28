import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js'

export default class Code extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'code',
      description: {
        content: 'cmd.code.description',
        examples: [
          'code explain```js\nfunction fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }```',
          'code review python```python\ndef sort_list(lst): return lst.sort()```',
        ],
        usage: 'code <task> <language> <code>',
      },
      category: 'ai',
      aliases: ['aicode', 'codeai'],
      cooldown: 10,
      args: true,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'AttachFiles'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'explain',
          description: 'Explain code in detail',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'language',
              description: 'Programming language',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'JavaScript', value: 'javascript' },
                { name: 'TypeScript', value: 'typescript' },
                { name: 'Python', value: 'python' },
                { name: 'Java', value: 'java' },
                { name: 'C++', value: 'cpp' },
                { name: 'C#', value: 'csharp' },
                { name: 'Go', value: 'go' },
                { name: 'Rust', value: 'rust' },
                { name: 'Other', value: 'other' },
              ],
            },
            {
              name: 'code',
              description: 'The code to explain',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: 'review',
          description: 'Review code and suggest improvements',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'language',
              description: 'Programming language',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'JavaScript', value: 'javascript' },
                { name: 'TypeScript', value: 'typescript' },
                { name: 'Python', value: 'python' },
                { name: 'Java', value: 'java' },
                { name: 'C++', value: 'cpp' },
                { name: 'C#', value: 'csharp' },
                { name: 'Go', value: 'go' },
                { name: 'Rust', value: 'rust' },
                { name: 'Other', value: 'other' },
              ],
            },
            {
              name: 'code',
              description: 'The code to review',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: 'optimize',
          description: 'Optimize code for better performance',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'language',
              description: 'Programming language',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'JavaScript', value: 'javascript' },
                { name: 'TypeScript', value: 'typescript' },
                { name: 'Python', value: 'python' },
                { name: 'Java', value: 'java' },
                { name: 'C++', value: 'cpp' },
                { name: 'C#', value: 'csharp' },
                { name: 'Go', value: 'go' },
                { name: 'Rust', value: 'rust' },
                { name: 'Other', value: 'other' },
              ],
            },
            {
              name: 'code',
              description: 'The code to optimize',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: 'debug',
          description: 'Debug code and identify issues',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'language',
              description: 'Programming language',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'JavaScript', value: 'javascript' },
                { name: 'TypeScript', value: 'typescript' },
                { name: 'Python', value: 'python' },
                { name: 'Java', value: 'java' },
                { name: 'C++', value: 'cpp' },
                { name: 'C#', value: 'csharp' },
                { name: 'Go', value: 'go' },
                { name: 'Rust', value: 'rust' },
                { name: 'Other', value: 'other' },
              ],
            },
            {
              name: 'code',
              description: 'The code to debug',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
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

    let task: 'explain' | 'review' | 'optimize' | 'debug'
    let language: string
    let code: string

    if (ctx.isInteraction) {
      task = ctx.options.getSubCommand() as any
      language = ctx.options.get('language', true)?.value as string
      code = ctx.options.get('code', true)?.value as string
    } else {
      // Parse text command
      const taskMatch = args[0]?.toLowerCase()
      if (!['explain', 'review', 'optimize', 'debug'].includes(taskMatch)) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: '❌ Please specify a task: explain, review, optimize, or debug',
              color: 0xff0000,
            },
          ],
        })
      }
      task = taskMatch as any

      // Extract language and code from the message
      const content = args.slice(1).join(' ')
      const codeBlockMatch = content.match(/```(\w+)?\n?([\s\S]+?)```/)

      if (!codeBlockMatch) {
        return await ctx.sendMessage({
          embeds: [
            {
              description:
                '❌ Please provide code in a code block with language\nExample: \\`\\`\\`js\nconst x = 1;\n\\`\\`\\`',
              color: 0xff0000,
            },
          ],
        })
      }

      language = codeBlockMatch[1] || 'other'
      code = codeBlockMatch[2].trim()
    }

    await ctx.sendDeferMessage(
      `🔍 ${task.charAt(0).toUpperCase() + task.slice(1)}ing your ${language} code...`
    )

    try {
      const response = await nvidiaService.analyzeCode(
        ctx.author?.id || 'unknown',
        code,
        language,
        task
      )

      // Split response if too long
      const chunks = response.match(/[\s\S]{1,1900}/g) || []

      if (chunks.length === 1) {
        await ctx.editMessage({
          embeds: [
            {
              title: `📝 Code ${task.charAt(0).toUpperCase() + task.slice(1)}`,
              description: chunks[0],
              fields: [
                { name: 'Language', value: language, inline: true },
                { name: 'Model', value: 'Qwen 2.5 Coder', inline: true },
              ],
              color: 0x76b900,
              timestamp: new Date().toISOString(),
            },
          ],
        })
      } else {
        // If response is too long, send as file
        const buffer = Buffer.from(response, 'utf-8')
        const attachment = new AttachmentBuilder(buffer, { name: `code_${task}_${Date.now()}.md` })

        await ctx.editMessage({
          content: null,
          embeds: [
            {
              title: `📝 Code ${task.charAt(0).toUpperCase() + task.slice(1)}`,
              description: `The analysis is too long for Discord. Please see the attached file.`,
              fields: [
                { name: 'Language', value: language, inline: true },
                { name: 'Model', value: 'Qwen 2.5 Coder', inline: true },
                { name: 'Response Length', value: `${response.length} characters`, inline: true },
              ],
              color: 0x76b900,
              timestamp: new Date().toISOString(),
            },
          ],
          files: [attachment],
        })
      }
    } catch (error) {
      console.error('Code analysis error:', error)
      await ctx.editMessage({
        embeds: [
          {
            description: `❌ Failed to ${task} code: ${(error as Error).message}`,
            color: 0xff0000,
          },
        ],
      })
    }
  }
}

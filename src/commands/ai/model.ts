import { Command, type Context, type MahinaBot } from '#common/index'
import { ApplicationCommandOptionType } from 'discord.js'

export default class Model extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'model',
      description: {
        content: 'cmd.model.description',
        examples: ['model', 'model select llama-70b', 'model info deepseek-r1'],
        usage: 'model [subcommand] [model]',
      },
      category: 'ai',
      aliases: ['aimodel', 'setmodel'],
      cooldown: 3,
      args: false,
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
          name: 'list',
          description: 'List all available AI models',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'select',
          description: 'Select an AI model',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'model',
              description: 'The model to select',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'DeepSeek R1 (Reasoning)', value: 'deepseek-r1' },
                { name: 'Qwen 2.5 Coder (Programming)', value: 'qwen-coder' },
                { name: 'Llama 3.3 70B (General)', value: 'llama-70b' },
                { name: 'Llama 3.1 70B (Streaming)', value: 'llama-70b-stream' },
              ],
            },
          ],
        },
        {
          name: 'info',
          description: 'Get information about a specific model',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'model',
              description: 'The model to get info about',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: 'DeepSeek R1', value: 'deepseek-r1' },
                { name: 'Qwen 2.5 Coder', value: 'qwen-coder' },
                { name: 'Llama 3.3 70B', value: 'llama-70b' },
                { name: 'Llama 3.1 70B (Streaming)', value: 'llama-70b-stream' },
              ],
            },
          ],
        },
        {
          name: 'current',
          description: 'Show your current AI model',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const subcommand =
      ctx.interaction?.options.getSubcommand() || args[0]?.toLowerCase() || 'current'
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

    switch (subcommand) {
      case 'list': {
        const embed = nvidiaService.createModelEmbed()
        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'select': {
        const modelKey = ctx.interaction?.options.getString('model') || args[1]

        if (!modelKey) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: '❌ Please specify a model to select',
                color: 0xff0000,
              },
            ],
          })
        }

        const success = nvidiaService.setUserModel(ctx.author.id, modelKey)

        if (!success) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Invalid model: \`${modelKey}\``,
                color: 0xff0000,
              },
            ],
          })
        }

        const model = nvidiaService.getModelInfo(modelKey)
        return await ctx.sendMessage({
          embeds: [
            {
              title: '✅ Model Selected',
              description: `You are now using **${model!.name}**`,
              fields: [
                { name: 'Category', value: model!.category, inline: true },
                { name: 'Context Length', value: `${model!.contextLength} tokens`, inline: true },
                {
                  name: 'Streaming',
                  value: model!.streaming ? 'Enabled' : 'Disabled',
                  inline: true,
                },
              ],
              color: 0x76b900,
            },
          ],
        })
      }

      case 'info': {
        const modelKey = ctx.interaction?.options.getString('model') || args[1]

        if (!modelKey) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: '❌ Please specify a model to get info about',
                color: 0xff0000,
              },
            ],
          })
        }

        const model = nvidiaService.getModelInfo(modelKey)

        if (!model) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Model not found: \`${modelKey}\``,
                color: 0xff0000,
              },
            ],
          })
        }

        return await ctx.sendMessage({
          embeds: [
            {
              title: `🤖 ${model.name}`,
              description: model.description,
              fields: [
                { name: 'Model ID', value: `\`${model.id}\``, inline: false },
                { name: 'Category', value: model.category, inline: true },
                { name: 'Context Length', value: `${model.contextLength} tokens`, inline: true },
                { name: 'Max Tokens', value: `${model.maxTokens}`, inline: true },
                { name: 'Temperature', value: `${model.temperature}`, inline: true },
                { name: 'Top P', value: `${model.topP}`, inline: true },
                {
                  name: 'Streaming',
                  value: model.streaming ? '✅ Supported' : '❌ Not Supported',
                  inline: true,
                },
              ],
              color: 0x76b900,
            },
          ],
        })
      }

      case 'current':
      default: {
        const embed = nvidiaService.createModelStatusEmbed(ctx.author.id)
        return await ctx.sendMessage({ embeds: [embed] })
      }
    }
  }
}

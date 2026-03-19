import Command from '#common/command'
import {
  createAIModelCatalogEmbed,
  createAIModelStatusEmbed,
  getAIModelInfo,
  getAllAvailableAIModels,
  getPreferredAIService,
  setUserAIModel,
} from '#common/ai_runtime'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'

export default class Model extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'model',
      description: {
        content:
          'Gerencie modelos de IA da NVIDIA - incluindo Llama 4 Maverick e outros modelos avançados',
        examples: [
          'model',
          'model select llama-4-maverick',
          'model info deepseek-r1',
          'model stats',
        ],
        usage: 'model [subcommand] [model]',
      },
      category: 'ai',
      aliases: ['aimodel', 'setmodel', 'models'],
      cooldown: 3,
      args: false,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'list',
          description: 'Listar todos os modelos de IA disponíveis',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'category',
              description: 'Filtrar por categoria',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: '🌟 Multimodal', value: 'multimodal' },
                { name: '🧠 Raciocínio', value: 'reasoning' },
                { name: '👁️ Visão', value: 'vision' },
                { name: '💬 Geral', value: 'general' },
                { name: '💻 Código', value: 'coding' },
              ],
            },
          ],
        },
        {
          name: 'select',
          description: 'Selecionar um modelo de IA',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'model',
              description: 'O modelo para selecionar',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: '🧠 DeepSeek R1 (Raciocínio)', value: 'deepseek-r1' },
                { name: '💬 Llama 3.3 70B', value: 'llama-70b' },
                { name: '📡 Llama 3.1 70B (Stream)', value: 'llama-70b-stream' },
                { name: '⚡ Llama 3 8B', value: 'llama3-8b' },
                { name: '👁️ Llama 3.2 11B Vision', value: 'llama-3.2-11b-vision' },
                { name: '🔍 Llama 3.2 90B Vision', value: 'llama-3.2-90b-vision' },
                { name: '💻 Qwen 2.5 Coder 32B', value: 'qwen-coder' },
                { name: '🎯 Qwen2 7B Instruct', value: 'qwen2-7b' },
                { name: '🖥️ Code Llama 70B', value: 'codellama-70b' },
                { name: '🚀 Mistral Large 2', value: 'mistral-large-2' },
                { name: '⚙️ Mixtral 8x7B', value: 'mixtral-8x7b' },
                { name: '🧩 Mixtral 8x22B', value: 'mixtral-8x22b' },
                { name: '💡 Codestral 22B', value: 'codestral-22b' },
                { name: '📱 Phi-3 Medium 128K', value: 'phi-3-medium' },
                { name: '⚡ Phi-3 Small 128K', value: 'phi-3-small' },
                { name: '🔷 Gemma 2 27B', value: 'gemma-2-27b' },
                { name: '🔸 Gemma 2 9B', value: 'gemma-2-9b' },
                { name: '💻 CodeGemma 7B', value: 'codegemma-7b' },
              ],
            },
          ],
        },
        {
          name: 'info',
          description: 'Obter informações sobre um modelo específico',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'model',
              description: 'O modelo para obter informações',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: '🧠 DeepSeek R1', value: 'deepseek-r1' },
                { name: '💬 Llama 3.3 70B', value: 'llama-70b' },
                { name: '📡 Llama 3.1 70B (Stream)', value: 'llama-70b-stream' },
                { name: '⚡ Llama 3 8B', value: 'llama3-8b' },
                { name: '👁️ Llama 3.2 11B Vision', value: 'llama-3.2-11b-vision' },
                { name: '🔍 Llama 3.2 90B Vision', value: 'llama-3.2-90b-vision' },
                { name: '💻 Qwen 2.5 Coder 32B', value: 'qwen-coder' },
                { name: '🎯 Qwen2 7B Instruct', value: 'qwen2-7b' },
                { name: '👁️ Gemma 3 27B', value: 'gemma-3-27b' },
                { name: '🌍 Cosmos Predict 7B', value: 'cosmos-predict-7b' },
              ],
            },
          ],
        },
        {
          name: 'current',
          description: 'Mostrar seu modelo de IA atual',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'stats',
          description: 'Ver estatísticas de uso dos modelos',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'period',
              description: 'Período de tempo',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: 'Última hora', value: '1h' },
                { name: 'Últimas 24 horas', value: '24h' },
                { name: 'Últimos 7 dias', value: '7d' },
                { name: 'Últimos 30 dias', value: '30d' },
              ],
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand() || 'current'
      : args[0]?.toLowerCase() || 'current'

    // Try enhanced service first, fallback to regular
    const nvidiaService = getPreferredAIService(client)

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.model.ui.errors.service_unavailable'),
            color: client.config.color.red,
          },
        ],
      })
    }

    switch (subcommand) {
      case 'list': {
        const category = ctx.isInteraction
          ? (ctx.options.get('category')?.value as string)
          : args[1]

        if (category) {
          const models = getAllAvailableAIModels(client).filter(
            (model) => model.category === category
          )
          const embed = new EmbedBuilder()
            .setTitle(t('cmd.model.ui.list.title', { category }))
            .setColor(client.config.color.blue)
            .setTimestamp()

          if (models.length === 0) {
            embed.setDescription(t('cmd.model.ui.list.empty_category'))
          } else {
            for (const model of models) {
              embed.addFields({
                name: model.name,
                value: t('cmd.model.ui.list.item', {
                  description: model.description,
                  contextLength: model.contextLength.toLocaleString(),
                }),
                inline: false,
              })
            }
          }

          return await ctx.sendMessage({ embeds: [embed] })
        }

        const catalogEmbed = createAIModelCatalogEmbed(client)
        if (catalogEmbed) {
          return await ctx.sendMessage({ embeds: [catalogEmbed as EmbedBuilder] })
        }

        if (nvidiaService.createEnhancedModelEmbed) {
          const embed = nvidiaService.createEnhancedModelEmbed()
          return await ctx.sendMessage({ embeds: [embed] })
        } else {
          const embed = nvidiaService.createModelEmbed()
          return await ctx.sendMessage({ embeds: [embed] })
        }
      }

      case 'select': {
        const modelKey = ctx.isInteraction ? (ctx.options.get('model')?.value as string) : args[1]

        if (!modelKey) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.missing_model_select'),
                color: client.config.color.red,
              },
            ],
          })
        }

        const selection = setUserAIModel(client, ctx.author!.id, modelKey)

        if (!selection.success) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.invalid_model', { model: modelKey }),
                color: client.config.color.red,
              },
            ],
          })
        }

        const model = selection.model
        const embed = new EmbedBuilder()
          .setTitle(t('cmd.model.ui.select.title'))
          .setDescription(t('cmd.model.ui.select.description', { model: model!.name }))
          .setColor(client.config.color.green)
          .addFields(
            { name: t('cmd.model.ui.fields.category'), value: model!.category, inline: true },
            {
              name: t('cmd.model.ui.fields.context'),
              value: `${model!.contextLength.toLocaleString()} tokens`,
              inline: true,
            },
            {
              name: t('cmd.model.ui.fields.streaming'),
              value: model!.streaming
                ? t('cmd.model.ui.streaming.enabled')
                : t('cmd.model.ui.streaming.disabled'),
              inline: true,
            }
          )
          .setFooter({ text: t('cmd.model.ui.select.footer') })

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'info': {
        const modelKey = ctx.isInteraction ? (ctx.options.get('model')?.value as string) : args[1]

        if (!modelKey) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.missing_model_info'),
                color: client.config.color.red,
              },
            ],
          })
        }

        const model = getAIModelInfo(client, modelKey)

        if (!model) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.model_not_found', { model: modelKey }),
                color: client.config.color.red,
              },
            ],
          })
        }

        const embed = new EmbedBuilder()
          .setTitle(`🤖 ${model.name}`)
          .setDescription(model.description)
          .setColor(client.config.color.main)
          .addFields(
            { name: t('cmd.model.ui.fields.model_id'), value: `\`${model.id}\``, inline: false },
            { name: t('cmd.model.ui.fields.category'), value: model.category, inline: true },
            {
              name: t('cmd.model.ui.fields.context'),
              value: `${model.contextLength.toLocaleString()} tokens`,
              inline: true,
            },
            {
              name: t('cmd.model.ui.fields.max_tokens'),
              value: `${model.maxTokens.toLocaleString()}`,
              inline: true,
            },
            {
              name: t('cmd.model.ui.fields.temperature'),
              value: `${model.temperature}`,
              inline: true,
            },
            { name: t('cmd.model.ui.fields.top_p'), value: `${model.topP}`, inline: true },
            {
              name: t('cmd.model.ui.fields.streaming'),
              value: model.streaming
                ? t('cmd.model.ui.streaming.supported')
                : t('cmd.model.ui.streaming.unsupported'),
              inline: true,
            }
          )

        // Add features if enhanced model
        if (model.features && model.features.length > 0) {
          embed.addFields({
            name: t('cmd.model.ui.fields.features'),
            value: model.features.map((f) => `• ${f}`).join('\n'),
            inline: false,
          })
        }

        // Add cost if available
        if (model.costPerMillion) {
          embed.addFields({
            name: t('cmd.model.ui.fields.cost'),
            value: t('cmd.model.ui.cost_value', { cost: model.costPerMillion }),
            inline: true,
          })
        }

        if (model.latency) {
          embed.addFields({
            name: t('cmd.model.ui.fields.latency'),
            value: model.latency,
            inline: true,
          })
        }

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'stats': {
        const period = ctx.isInteraction
          ? (ctx.options.get('period')?.value as string) || '24h'
          : args[1] || '24h'

        if (!nvidiaService.getModelStats) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.stats_unavailable'),
                color: client.config.color.red,
              },
            ],
          })
        }

        const stats = await nvidiaService.getModelStats(period)
        const embed = new EmbedBuilder()
          .setTitle(t('cmd.model.ui.stats.title', { period }))
          .setColor(client.config.color.blue)
          .setDescription(t('cmd.model.ui.stats.description'))
          .setTimestamp()

        if (Array.isArray(stats) && stats.length > 0) {
          for (const stat of stats.slice(0, 10)) {
            embed.addFields({
              name: stat.model_name,
              value: [
                t('cmd.model.ui.stats.requests', { total: stat.total_requests }),
                t('cmd.model.ui.stats.tokens', {
                  total: Number(stat.total_tokens).toLocaleString(),
                }),
                t('cmd.model.ui.stats.avg_time', {
                  time: Math.round(stat.avg_response_time),
                }),
                t('cmd.model.ui.stats.success_rate', {
                  rate: Math.round(stat.success_rate * 100),
                }),
              ].join(' | '),
              inline: false,
            })
          }
        } else {
          embed.setDescription(t('cmd.model.ui.stats.empty'))
        }

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'current':
      default: {
        const embed = createAIModelStatusEmbed(client, ctx.author!.id)
        if (!embed) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.model.ui.errors.current_model_unavailable'),
                color: client.config.color.red,
              },
            ],
          })
        }

        return await ctx.sendMessage({ embeds: [embed] })
      }
    }
  }
}

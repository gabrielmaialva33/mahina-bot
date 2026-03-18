import Command from '#common/command'
import { getPreferredAIService } from '#common/ai_runtime'
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
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand() || 'current'
      : args[0]?.toLowerCase() || 'current'

    // Try enhanced service first, fallback to regular
    const nvidiaService = getPreferredAIService(client)

    if (!nvidiaService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Serviço de IA NVIDIA não está configurado',
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
                description: '❌ Por favor, especifique um modelo para selecionar',
                color: client.config.color.red,
              },
            ],
          })
        }

        const success = nvidiaService.setUserModel(ctx.author!.id, modelKey)

        if (!success) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Modelo inválido: \`${modelKey}\``,
                color: client.config.color.red,
              },
            ],
          })
        }

        const model = nvidiaService.getModelInfo(modelKey)
        const embed = new EmbedBuilder()
          .setTitle('✅ Modelo Selecionado')
          .setDescription(`Você agora está usando **${model!.name}**`)
          .setColor(client.config.color.green)
          .addFields(
            { name: 'Categoria', value: model!.category, inline: true },
            {
              name: 'Contexto',
              value: `${model!.contextLength.toLocaleString()} tokens`,
              inline: true,
            },
            {
              name: 'Streaming',
              value: model!.streaming ? '✅ Habilitado' : '❌ Desabilitado',
              inline: true,
            }
          )
          .setFooter({ text: 'Use !chat ou /chat para conversar com o novo modelo!' })

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'info': {
        const modelKey = ctx.isInteraction ? (ctx.options.get('model')?.value as string) : args[1]

        if (!modelKey) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: '❌ Por favor, especifique um modelo',
                color: client.config.color.red,
              },
            ],
          })
        }

        const model = nvidiaService.getModelInfo(modelKey)

        if (!model) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Modelo não encontrado: \`${modelKey}\``,
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
            { name: 'ID do Modelo', value: `\`${model.id}\``, inline: false },
            { name: 'Categoria', value: model.category, inline: true },
            {
              name: 'Contexto',
              value: `${model.contextLength.toLocaleString()} tokens`,
              inline: true,
            },
            { name: 'Max Tokens', value: `${model.maxTokens.toLocaleString()}`, inline: true },
            { name: 'Temperatura', value: `${model.temperature}`, inline: true },
            { name: 'Top P', value: `${model.topP}`, inline: true },
            {
              name: 'Streaming',
              value: model.streaming ? '✅ Suportado' : '❌ Não Suportado',
              inline: true,
            }
          )

        // Add features if enhanced model
        if (model.features && model.features.length > 0) {
          embed.addFields({
            name: '✨ Recursos',
            value: model.features.map((f) => `• ${f}`).join('\n'),
            inline: false,
          })
        }

        // Add cost if available
        if (model.costPerMillion) {
          embed.addFields({
            name: '💰 Custo',
            value: `$${model.costPerMillion} por milhão de tokens`,
            inline: true,
          })
        }

        if (model.latency) {
          embed.addFields({
            name: '⚡ Latência',
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
                description: '❌ Estatísticas não disponíveis',
                color: client.config.color.red,
              },
            ],
          })
        }

        const stats = await nvidiaService.getModelStats(period)
        const embed = new EmbedBuilder()
          .setTitle(`📊 Estatísticas de Uso (${period})`)
          .setColor(client.config.color.blue)
          .setDescription('Métricas de performance dos modelos de IA')
          .setTimestamp()

        if (Array.isArray(stats) && stats.length > 0) {
          for (const stat of stats.slice(0, 10)) {
            embed.addFields({
              name: stat.model_name,
              value: [
                `Requisições: **${stat.total_requests}**`,
                `Tokens: **${Number(stat.total_tokens).toLocaleString()}**`,
                `Tempo médio: **${Math.round(stat.avg_response_time)}ms**`,
                `Taxa de sucesso: **${Math.round(stat.success_rate * 100)}%**`,
              ].join(' | '),
              inline: false,
            })
          }
        } else {
          embed.setDescription('Nenhuma estatística disponível no momento.')
        }

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'current':
      default: {
        const embed = nvidiaService.createModelStatusEmbed(ctx.author!.id)
        return await ctx.sendMessage({ embeds: [embed] })
      }
    }
  }
}

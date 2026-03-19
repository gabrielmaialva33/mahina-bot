import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { getPreferredAIService } from '#common/ai_runtime'
import type { AIModelStatsRow } from '#common/ai_types'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

type QueueableJobType = 'embedding' | 'analysis' | 'generation' | 'batch'

export default class AIJobs extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aijobs',
      description: {
        content: 'Gerencie e monitore trabalhos de IA em segundo plano',
        examples: [
          'aijobs queue embedding "texto para processar"',
          'aijobs status <job-id>',
          'aijobs stats',
          'aijobs list',
        ],
        usage: 'aijobs <action> [options]',
      },
      category: 'ai',
      aliases: ['jobs', 'aiqueue'],
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
          name: 'queue',
          description: 'Adicionar um trabalho à fila',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'type',
              description: 'Tipo de trabalho',
              type: ApplicationCommandOptionType.String,
              required: true,
              choices: [
                { name: '🧮 Gerar Embedding', value: 'embedding' },
                { name: '📊 Análise de Mensagens', value: 'analysis' },
                { name: '🤖 Geração de Texto', value: 'generation' },
                { name: '📦 Processamento em Lote', value: 'batch' },
              ],
            },
            {
              name: 'data',
              description: 'Dados para processar',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: 'priority',
              description: 'Prioridade do trabalho (0-10)',
              type: ApplicationCommandOptionType.Integer,
              required: false,
              minValue: 0,
              maxValue: 10,
            },
          ],
        },
        {
          name: 'status',
          description: 'Verificar status de um trabalho',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'job_id',
              description: 'ID do trabalho',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: 'stats',
          description: 'Ver estatísticas da fila de trabalhos',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'list',
          description: 'Listar trabalhos recentes',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'filter',
              description: 'Filtrar por status',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: '⏳ Pendentes', value: 'pending' },
                { name: '🔄 Em Execução', value: 'active' },
                { name: '✅ Concluídos', value: 'completed' },
                { name: '❌ Falhados', value: 'failed' },
              ],
            },
          ],
        },
        {
          name: 'cancel',
          description: 'Cancelar um trabalho',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'job_id',
              description: 'ID do trabalho para cancelar',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand()
      : args[0]?.toLowerCase() || 'stats'

    const jobService = client.services.aiQueue

    if (!jobService?.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            title: '❌ Serviço Indisponível',
            description: 'O serviço de fila de trabalhos não está configurado ou disponível.',
            color: client.config.color.red,
            fields: [
              {
                name: 'Solução',
                value:
                  'Certifique-se de que o Redis e a fila assíncrona estão configurados corretamente.',
              },
            ],
          },
        ],
      })
    }

    switch (subcommand) {
      case 'queue':
        return await this.queueJob(ctx, client)

      case 'status':
        return await this.checkStatus(ctx, client)

      case 'stats':
        return await this.showStats(ctx, client)

      case 'list':
        return await this.listJobs(ctx, client)

      case 'cancel':
        return await this.cancelJob(ctx, client)

      default:
        return await this.showStats(ctx, client)
    }
  }

  private async queueJob(ctx: Context, client: MahinaBot): Promise<void> {
    const jobType = ctx.isInteraction
      ? (ctx.options.get('type')?.value as QueueableJobType) || 'embedding'
      : 'embedding'
    const data = ctx.isInteraction
      ? (ctx.options.get('data')?.value as string)
      : ctx.args.slice(2).join(' ')
    const priority = ctx.isInteraction ? (ctx.options.get('priority')?.value as number) || 0 : 0

    if (!data) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça dados para processar!',
            color: client.config.color.red,
          },
        ],
      })
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.blue)
      .setDescription('🔄 Adicionando trabalho à fila...')

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      const jobService = client.services.aiQueue!
      let jobId: string

      // Prepare job data based on type
      switch (jobType) {
        case 'embedding':
          jobId = await jobService.queueJob({
            type: 'embedding',
            userId: ctx.author.id,
            guildId: ctx.guild?.id || 'DM',
            data: {
              content: data,
              contentType: 'message',
              metadata: {
                command: 'aijobs',
                timestamp: new Date().toISOString(),
              },
            },
            priority,
          })
          break

        case 'analysis':
          jobId = await jobService.queueJob({
            type: 'analysis',
            userId: ctx.author.id,
            guildId: ctx.guild?.id || 'DM',
            data: {
              messages: [data],
              analysisType: 'comprehensive',
            },
            priority,
          })
          break

        case 'generation':
          jobId = await jobService.queueJob({
            type: 'generation',
            userId: ctx.author.id,
            guildId: ctx.guild?.id || 'DM',
            data: {
              prompt: data,
              model: 'llama-4-maverick',
              parameters: {
                temperature: 0.7,
                maxTokens: 1024,
              },
            },
            priority,
          })
          break

        case 'batch':
          jobId = await jobService.queueJob({
            type: 'batch_processing',
            userId: ctx.author.id,
            guildId: ctx.guild?.id || 'DM',
            data: {
              items: [{ type: 'analysis', message: data }],
            },
            priority,
          })
          break

        default:
          throw new Error('Tipo de trabalho inválido')
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Trabalho Adicionado à Fila')
        .setColor(client.config.color.green)
        .addFields(
          { name: 'ID do Trabalho', value: `\`${jobId}\``, inline: false },
          { name: 'Tipo', value: this.getJobTypeLabel(jobType), inline: true },
          { name: 'Prioridade', value: priority.toString(), inline: true },
          { name: 'Status', value: '⏳ Pendente', inline: true }
        )
        .setFooter({ text: 'Use /aijobs status <id> para acompanhar' })
        .setTimestamp()

      await ctx.editMessage({ embeds: [embed] })
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro ao Adicionar Trabalho')
        .setColor(client.config.color.red)
        .setDescription((error as Error).message)

      await ctx.editMessage({ embeds: [errorEmbed] })
    }
  }

  private async checkStatus(ctx: Context, client: MahinaBot): Promise<void> {
    const jobId = ctx.isInteraction ? (ctx.options.get('job_id')?.value as string) : ctx.args[1]

    if (!jobId) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça o ID do trabalho!',
            color: client.config.color.red,
          },
        ],
      })
    }

    try {
      const jobService = client.services.aiQueue!
      const job = await jobService.getJobStatus(jobId)

      if (!job) {
        return await ctx.sendMessage({
          embeds: [
            {
              description: `❌ Trabalho com ID \`${jobId}\` não encontrado!`,
              color: client.config.color.red,
            },
          ],
        })
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Status do Trabalho`)
        .setColor(this.getStatusColor(job.state, client))
        .addFields(
          { name: 'ID', value: `\`${job.id}\``, inline: false },
          { name: 'Nome', value: job.name, inline: true },
          { name: 'Estado', value: this.getStatusLabel(job.state), inline: true },
          { name: 'Prioridade', value: job.priority.toString(), inline: true },
          { name: 'Criado em', value: new Date(job.created).toLocaleString('pt-BR'), inline: true }
        )

      if (job.started) {
        embed.addFields({
          name: 'Iniciado em',
          value: new Date(job.started).toLocaleString('pt-BR'),
          inline: true,
        })
      }

      if (job.completed) {
        embed.addFields({
          name: 'Concluído em',
          value: new Date(job.completed).toLocaleString('pt-BR'),
          inline: true,
        })
      }

      if (job.data) {
        embed.addFields({
          name: 'Dados',
          value: `\`\`\`json\n${JSON.stringify(job.data, null, 2).substring(0, 500)}\`\`\``,
          inline: false,
        })
      }

      if (job.output) {
        embed.addFields({
          name: 'Resultado',
          value: `\`\`\`json\n${JSON.stringify(job.output, null, 2).substring(0, 500)}\`\`\``,
          inline: false,
        })
      }

      await ctx.sendMessage({ embeds: [embed] })
    } catch (error) {
      await ctx.sendMessage({
        embeds: [
          {
            title: '❌ Erro',
            description: (error as Error).message,
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async showStats(ctx: Context, client: MahinaBot): Promise<void> {
    try {
      const jobService = client.services.aiQueue!
      const stats = await jobService.getQueueStats()

      const embed = new EmbedBuilder()
        .setTitle('📊 Estatísticas da Fila de Trabalhos')
        .setColor(client.config.color.blue)
        .setDescription('Visão geral do sistema de processamento assíncrono')
        .setTimestamp()

      let totalPending = 0
      let totalCompleted = 0
      let totalFailed = 0

      for (const [queue, queueStats] of Object.entries(stats)) {
        totalPending += queueStats.pending
        totalCompleted += queueStats.completed
        totalFailed += queueStats.failed

        embed.addFields({
          name: `📦 ${this.formatQueueName(queue)}`,
          value: [
            `⏳ Pendentes: **${queueStats.pending}**`,
            `✅ Concluídos: **${queueStats.completed}**`,
            `❌ Falhados: **${queueStats.failed}**`,
          ].join('\n'),
          inline: true,
        })
      }

      embed.addFields(
        { name: '\u200B', value: '\u200B', inline: false },
        {
          name: '📈 Totais',
          value: [
            `Total Pendentes: **${totalPending}**`,
            `Total Concluídos: **${totalCompleted}**`,
            `Total Falhados: **${totalFailed}**`,
            `Taxa de Sucesso: **${totalCompleted > 0 ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100) : 0}%**`,
          ].join('\n'),
          inline: false,
        }
      )

      // Add performance metrics if available
      const nvidiaService = getPreferredAIService(client)
      if (nvidiaService?.getModelStats) {
        const modelStats = await nvidiaService.getModelStats('1h')
        if (modelStats.length > 0) {
          embed.addFields({
            name: '⚡ Performance (1h)',
            value: modelStats
              .slice(0, 3)
              .map(
                (stat: AIModelStatsRow) =>
                  `${stat.model_name}: ${stat.total_requests} req, ${Math.round(stat.avg_response_time)}ms`
              )
              .join('\n'),
            inline: false,
          })
        }
      }

      await ctx.sendMessage({ embeds: [embed] })
    } catch (error) {
      await ctx.sendMessage({
        embeds: [
          {
            title: '❌ Erro',
            description: 'Falha ao obter estatísticas',
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async listJobs(ctx: Context, client: MahinaBot): Promise<void> {
    const filter = ctx.isInteraction ? (ctx.options.get('filter')?.value as string) : undefined

    // This would require implementation in the job service
    // For now, show a placeholder
    const embed = new EmbedBuilder()
      .setTitle('📋 Trabalhos Recentes')
      .setColor(client.config.color.main)
      .setDescription('Lista de trabalhos processados recentemente')
      .addFields({
        name: 'Em desenvolvimento',
        value: 'Esta funcionalidade será implementada em breve!',
      })
      .setTimestamp()

    await ctx.sendMessage({ embeds: [embed] })
  }

  private async cancelJob(ctx: Context, client: MahinaBot): Promise<void> {
    const jobId = ctx.isInteraction ? (ctx.options.get('job_id')?.value as string) : ctx.args[1]

    if (!jobId) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça o ID do trabalho!',
            color: client.config.color.red,
          },
        ],
      })
    }

    try {
      const jobService = client.services.aiQueue!
      await jobService.cancelJob(jobId)

      await ctx.sendMessage({
        embeds: [
          {
            title: '✅ Trabalho Cancelado',
            description: `O trabalho \`${jobId}\` foi cancelado com sucesso.`,
            color: client.config.color.green,
          },
        ],
      })
    } catch (error) {
      await ctx.sendMessage({
        embeds: [
          {
            title: '❌ Erro ao Cancelar',
            description: (error as Error).message,
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private getJobTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      embedding: '🧮 Embedding',
      analysis: '📊 Análise',
      generation: '🤖 Geração',
      batch: '📦 Lote',
      training: '🎓 Treinamento',
    }
    return labels[type] || type
  }

  private getStatusLabel(state: string): string {
    const labels: Record<string, string> = {
      created: '⏳ Criado',
      active: '🔄 Em Execução',
      completed: '✅ Concluído',
      failed: '❌ Falhou',
      cancelled: '🚫 Cancelado',
    }
    return labels[state] || state
  }

  private getStatusColor(state: string, client: MahinaBot): number {
    const colors: Record<string, number> = {
      created: client.config.color.yellow,
      active: client.config.color.blue,
      completed: client.config.color.green,
      failed: client.config.color.red,
      cancelled: client.config.color.red,
    }
    return colors[state] || client.config.color.main
  }

  private formatQueueName(queue: string): string {
    const names: Record<string, string> = {
      'ai-embedding': 'Fila de Embeddings',
      'ai-analysis': 'Fila de Análise',
      'ai-generation': 'Fila de Geração',
      'ai-training': 'Fila de Treinamento',
      'ai-batch': 'Fila de Lote',
    }
    return names[queue] || queue
  }
}

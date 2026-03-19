import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import { getPreferredAIService } from '#common/ai_runtime'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

type Period = '1h' | '24h' | '7d' | '30d' | 'all'

function createPeriodOption() {
  return {
    name: 'period',
    description: 'Período de análise',
    type: ApplicationCommandOptionType.String,
    required: false,
    choices: [
      { name: 'Última hora', value: '1h' },
      { name: 'Últimas 24 horas', value: '24h' },
      { name: 'Últimos 7 dias', value: '7d' },
      { name: 'Últimos 30 dias', value: '30d' },
      { name: 'Todos os tempos', value: 'all' },
    ],
  }
}

export default class AIAnalytics extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aianalytics',
      description: {
        content: 'Analise uso de IA, memória e métricas do runtime atual',
        examples: [
          'aianalytics user',
          'aianalytics models',
          'aianalytics search "pergunta sobre música"',
        ],
        usage: 'aianalytics <type> [options]',
      },
      category: 'ai',
      aliases: ['aistats', 'analytics'],
      cooldown: 5,
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
          name: 'user',
          description: 'Resumo do seu uso de IA',
          type: ApplicationCommandOptionType.Subcommand,
          options: [createPeriodOption()],
        },
        {
          name: 'models',
          description: 'Uso e performance dos modelos carregados',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'sentiment',
          description: 'Distribuição de sentimento aprendida pela memória',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'search',
          description: 'Buscar trechos recentes do seu histórico local',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'query',
              description: 'Texto para buscar',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: 'patterns',
          description: 'Padrões aprendidos sobre seu uso',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'export',
          description: 'Exportar resumo em Markdown',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand()
      : args[0]?.toLowerCase() || 'user'

    const prisma = await client.db.getPrismaClient().catch(() => null)

    if (!prisma) {
      return ctx.sendMessage({
        embeds: [
          {
            title: '❌ Banco de Dados Indisponível',
            description: 'O MongoDB não está disponível no momento.',
            color: client.config.color.red,
          },
        ],
      })
    }

    await ctx.sendMessage({
      embeds: [
        new EmbedBuilder()
          .setColor(client.config.color.blue)
          .setDescription('📊 Analisando dados...'),
      ],
    })

    switch (subcommand) {
      case 'user':
        return this.userAnalytics(ctx, client, prisma)
      case 'models':
        return this.modelAnalytics(ctx, client)
      case 'sentiment':
        return this.sentimentAnalytics(ctx, client, prisma)
      case 'search':
        return this.searchAnalytics(ctx, client, prisma)
      case 'patterns':
        return this.patternAnalytics(ctx, client, prisma)
      case 'export':
        return this.exportAnalytics(ctx, client, prisma)
      default:
        return this.userAnalytics(ctx, client, prisma)
    }
  }

  private async userAnalytics(ctx: Context, client: MahinaBot, prisma: any): Promise<void> {
    const period = ctx.isInteraction ? (ctx.options.get('period')?.value as Period) || '7d' : '7d'
    const since = this.getDateFromPeriod(period)
    const where = since
      ? {
          userId: ctx.author.id,
          updatedAt: { gte: since },
        }
      : { userId: ctx.author.id }

    const histories = await prisma.chatHistory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        channelId: true,
        messages: true,
        updatedAt: true,
      },
    })

    const totalMessages = histories.reduce(
      (sum: number, history: { messages: unknown[] }) =>
        sum + (Array.isArray(history.messages) ? history.messages.length : 0),
      0
    )

    const embed = new EmbedBuilder()
      .setTitle('📊 Seu Uso de IA')
      .setColor(client.config.color.blue)
      .addFields(
        { name: 'Período', value: this.getPeriodLabel(period), inline: true },
        { name: 'Conversas', value: histories.length.toString(), inline: true },
        { name: 'Mensagens', value: totalMessages.toString(), inline: true },
        {
          name: 'Última atividade',
          value: histories[0]
            ? new Date(histories[0].updatedAt).toLocaleString('pt-BR')
            : 'Sem dados',
          inline: false,
        }
      )
      .setTimestamp()

    await ctx.editMessage({ embeds: [embed] })
  }

  private async modelAnalytics(ctx: Context, client: MahinaBot): Promise<void> {
    const modelService = getPreferredAIService(client)
    const stats = (await modelService?.getModelStats?.('7d')) || []

    const embed = new EmbedBuilder()
      .setTitle('🤖 Métricas de Modelos')
      .setColor(client.config.color.blue)
      .setTimestamp()

    if (stats.length === 0) {
      embed.setDescription('Ainda não há métricas de modelos nesta execução.')
    } else {
      for (const stat of stats.slice(0, 5)) {
        embed.addFields({
          name: stat.model_name,
          value: [
            `Requisições: **${stat.total_requests}**`,
            `Tempo médio: **${Math.round(stat.avg_response_time)}ms**`,
            `Sucesso: **${Math.round(stat.success_rate * 100)}%**`,
          ].join('\n'),
          inline: true,
        })
      }
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async sentimentAnalytics(ctx: Context, client: MahinaBot, prisma: any): Promise<void> {
    const memory = await prisma.aIMemory.findUnique({
      where: {
        userId_guildId: {
          userId: ctx.author.id,
          guildId: ctx.guild?.id || 'DM',
        },
      },
    })

    const sentiment = (memory?.data as any)?.interactions?.sentiment || {
      positive: 0,
      neutral: 0,
      negative: 0,
    }

    const embed = new EmbedBuilder()
      .setTitle('💭 Sentimento Aprendido')
      .setColor(client.config.color.blue)
      .addFields(
        { name: 'Positivo', value: String(sentiment.positive || 0), inline: true },
        { name: 'Neutro', value: String(sentiment.neutral || 0), inline: true },
        { name: 'Negativo', value: String(sentiment.negative || 0), inline: true }
      )

    await ctx.editMessage({ embeds: [embed] })
  }

  private async searchAnalytics(ctx: Context, client: MahinaBot, prisma: any): Promise<void> {
    const query = ctx.isInteraction
      ? String(ctx.options.get('query')?.value || '')
      : ctx.args.slice(1).join(' ')
    const histories = await prisma.chatHistory.findMany({
      where: { userId: ctx.author.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { messages: true, updatedAt: true },
    })

    const matches = histories
      .flatMap((history: { messages: unknown[]; updatedAt: Date }) =>
        (Array.isArray(history.messages) ? history.messages : [])
          .map((message) => {
            if (!message || typeof message !== 'object') {
              return null
            }

            const content = 'content' in message ? String(message.content) : ''
            if (!content.toLowerCase().includes(query.toLowerCase())) {
              return null
            }

            return `• ${content.slice(0, 120)} (${new Date(history.updatedAt).toLocaleDateString('pt-BR')})`
          })
          .filter(Boolean)
      )
      .slice(0, 8)

    const embed = new EmbedBuilder()
      .setTitle('🔎 Busca no Histórico')
      .setColor(client.config.color.blue)
      .setDescription(matches.length > 0 ? matches.join('\n') : 'Nenhum trecho encontrado.')

    await ctx.editMessage({ embeds: [embed] })
  }

  private async patternAnalytics(ctx: Context, client: MahinaBot, prisma: any): Promise<void> {
    const memory = await prisma.aIMemory.findUnique({
      where: {
        userId_guildId: {
          userId: ctx.author.id,
          guildId: ctx.guild?.id || 'DM',
        },
      },
    })

    const data = (memory?.data as any) || {}
    const topCommands = Object.entries(data.interactions?.favoriteCommands || {})
      .sort(([, left], [, right]) => Number(right) - Number(left))
      .slice(0, 5)
      .map(([command, count]) => `${command}: ${count}`)

    const patterns = Array.isArray(data.learning?.patterns)
      ? data.learning.patterns.slice(0, 5)
      : []

    const embed = new EmbedBuilder()
      .setTitle('🧩 Padrões de Uso')
      .setColor(client.config.color.blue)
      .addFields(
        {
          name: 'Comandos frequentes',
          value: topCommands.length > 0 ? topCommands.join('\n') : 'Sem dados',
          inline: false,
        },
        {
          name: 'Padrões aprendidos',
          value: patterns.length > 0 ? patterns.join('\n') : 'Sem padrões registrados',
          inline: false,
        }
      )

    await ctx.editMessage({ embeds: [embed] })
  }

  private async exportAnalytics(ctx: Context, client: MahinaBot, prisma: any): Promise<void> {
    const historyCount = await prisma.chatHistory.count({ where: { userId: ctx.author.id } })
    const memoryCount = await prisma.aIMemory.count({ where: { userId: ctx.author.id } })

    const exportText = [
      '# AI Analytics Export',
      `- User: ${ctx.author.id}`,
      `- Histories: ${historyCount}`,
      `- Memory Entries: ${memoryCount}`,
      `- Generated At: ${new Date().toISOString()}`,
    ].join('\n')

    const embed = new EmbedBuilder()
      .setTitle('📦 Exportação de Analytics')
      .setColor(client.config.color.green)
      .setDescription(`\`\`\`md\n${exportText}\n\`\`\``)

    await ctx.editMessage({ embeds: [embed] })
  }

  private getDateFromPeriod(period: Period): Date | null {
    const now = Date.now()
    const map: Record<Exclude<Period, 'all'>, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }

    return period === 'all' ? null : new Date(now - map[period])
  }

  private getPeriodLabel(period: Period): string {
    const labels: Record<Period, string> = {
      '1h': 'Última hora',
      '24h': 'Últimas 24 horas',
      '7d': 'Últimos 7 dias',
      '30d': 'Últimos 30 dias',
      'all': 'Todos os tempos',
    }

    return labels[period]
  }
}

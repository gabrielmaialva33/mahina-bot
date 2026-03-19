import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js'
import type { Prisma, PrismaClient } from '@prisma/client'
import { getPreferredAIService } from '#common/ai_runtime'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  createAIAnalyticsLoadingEmbed,
  createExportAnalyticsEmbed,
  createModelAnalyticsEmbed,
  createPatternAnalyticsEmbed,
  createSearchAnalyticsEmbed,
  createSentimentAnalyticsEmbed,
  createUserAnalyticsEmbed,
  getAnalyticsDateFromPeriod,
} from '#common/aianalytics_runtime'

type Period = '1h' | '24h' | '7d' | '30d' | 'all'
type AnalyticsPrisma = PrismaClient
type AnalyticsChatMessage = { content?: string }
type AnalyticsSentiment = { positive: number; neutral: number; negative: number }
type AnalyticsMemoryData = {
  interactions?: {
    sentiment?: Partial<AnalyticsSentiment>
    favoriteCommands?: Record<string, number | string>
  }
  learning?: {
    patterns?: string[]
  }
}

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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand()
      : args[0]?.toLowerCase() || 'user'

    const prisma = await client.db.getPrismaClient().catch(() => null)

    if (!prisma) {
      return ctx.sendMessage({
        embeds: [
          {
            title: t('cmd.aianalytics.ui.errors.db_title'),
            description: t('cmd.aianalytics.ui.errors.db_unavailable'),
            color: client.config.color.red,
          },
        ],
      })
    }

    await ctx.sendMessage({
      embeds: [createAIAnalyticsLoadingEmbed(client.config.color.blue, t)],
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

  private async userAnalytics(
    ctx: Context,
    client: MahinaBot,
    prisma: AnalyticsPrisma
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const period = ctx.isInteraction ? (ctx.options.get('period')?.value as Period) || '7d' : '7d'
    const since = getAnalyticsDateFromPeriod(period)
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
      (sum: number, history) => sum + this.readHistoryMessages(history.messages).length,
      0
    )

    await ctx.editMessage({
      embeds: [
        createUserAnalyticsEmbed(
          client.config.color.blue,
          t,
          period,
          histories.length,
          totalMessages,
          histories[0]
            ? new Date(histories[0].updatedAt).toLocaleString('pt-BR')
            : t('cmd.aianalytics.ui.no_data')
        ),
      ],
    })
  }

  private async modelAnalytics(ctx: Context, client: MahinaBot): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const modelService = getPreferredAIService(client)
    const stats = (await modelService?.getModelStats?.('7d')) || []

    await ctx.editMessage({
      embeds: [createModelAnalyticsEmbed(client.config.color.blue, t, stats)],
    })
  }

  private async sentimentAnalytics(
    ctx: Context,
    client: MahinaBot,
    prisma: AnalyticsPrisma
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const memory = await prisma.aIMemory.findUnique({
      where: {
        userId_guildId: {
          userId: ctx.author.id,
          guildId: ctx.guild?.id || 'DM',
        },
      },
    })

    const sentimentSource = this.readMemoryData(memory?.data).interactions?.sentiment
    const sentiment: AnalyticsSentiment = {
      positive: Number(sentimentSource?.positive || 0),
      neutral: Number(sentimentSource?.neutral || 0),
      negative: Number(sentimentSource?.negative || 0),
    }

    await ctx.editMessage({
      embeds: [createSentimentAnalyticsEmbed(client.config.color.blue, t, sentiment)],
    })
  }

  private async searchAnalytics(
    ctx: Context,
    client: MahinaBot,
    prisma: AnalyticsPrisma
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
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
      .flatMap((history) =>
        this.readHistoryMessages(history.messages)
          .map((message) => {
            const content = message.content ?? ''
            if (!content.toLowerCase().includes(query.toLowerCase())) {
              return null
            }

            return `• ${content.slice(0, 120)} (${new Date(history.updatedAt).toLocaleDateString('pt-BR')})`
          })
          .filter(Boolean)
      )
      .slice(0, 8)

    await ctx.editMessage({
      embeds: [createSearchAnalyticsEmbed(client.config.color.blue, t, matches)],
    })
  }

  private async patternAnalytics(
    ctx: Context,
    client: MahinaBot,
    prisma: AnalyticsPrisma
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const memory = await prisma.aIMemory.findUnique({
      where: {
        userId_guildId: {
          userId: ctx.author.id,
          guildId: ctx.guild?.id || 'DM',
        },
      },
    })

    const data = this.readMemoryData(memory?.data)
    const topCommands = Object.entries(data.interactions?.favoriteCommands || {})
      .sort(([, left], [, right]) => Number(right) - Number(left))
      .slice(0, 5)
      .map(([command, count]) => `${command}: ${count}`)

    const patterns = Array.isArray(data.learning?.patterns)
      ? data.learning.patterns.slice(0, 5)
      : []

    await ctx.editMessage({
      embeds: [createPatternAnalyticsEmbed(client.config.color.blue, t, topCommands, patterns)],
    })
  }

  private async exportAnalytics(
    ctx: Context,
    client: MahinaBot,
    prisma: AnalyticsPrisma
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const historyCount = await prisma.chatHistory.count({ where: { userId: ctx.author.id } })
    const memoryCount = await prisma.aIMemory.count({ where: { userId: ctx.author.id } })

    const exportText = [
      t('cmd.aianalytics.ui.export.header'),
      `${t('cmd.aianalytics.ui.export.user')}: ${ctx.author.id}`,
      `${t('cmd.aianalytics.ui.export.histories')}: ${historyCount}`,
      `${t('cmd.aianalytics.ui.export.memory_entries')}: ${memoryCount}`,
      `${t('cmd.aianalytics.ui.export.generated_at')}: ${new Date().toISOString()}`,
    ].join('\n')

    await ctx.editMessage({
      embeds: [createExportAnalyticsEmbed(client.config.color.green, t, exportText)],
    })
  }

  private readHistoryMessages(value: Prisma.JsonValue | null | undefined): AnalyticsChatMessage[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return []
      }

      const content = 'content' in entry ? String(entry.content ?? '') : ''
      return [{ content }]
    })
  }

  private readMemoryData(value: Prisma.JsonValue | null | undefined): AnalyticsMemoryData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    return value as AnalyticsMemoryData
  }
}

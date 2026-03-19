import { EmbedBuilder } from 'discord.js'

type Translate = (key: string, params?: Record<string, unknown>) => string

type Period = '1h' | '24h' | '7d' | '30d' | 'all'

export function createAIAnalyticsLoadingEmbed(color: number, translate: Translate) {
  return new EmbedBuilder().setColor(color).setDescription(translate('cmd.aianalytics.ui.loading'))
}

export function createUserAnalyticsEmbed(
  color: number,
  translate: Translate,
  period: Period,
  conversationCount: number,
  totalMessages: number,
  lastActivity: string
) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.user.title'))
    .setColor(color)
    .addFields(
      {
        name: translate('cmd.aianalytics.ui.user.period'),
        value: getAnalyticsPeriodLabel(translate, period),
        inline: true,
      },
      {
        name: translate('cmd.aianalytics.ui.user.conversations'),
        value: String(conversationCount),
        inline: true,
      },
      {
        name: translate('cmd.aianalytics.ui.user.messages'),
        value: String(totalMessages),
        inline: true,
      },
      {
        name: translate('cmd.aianalytics.ui.user.last_activity'),
        value: lastActivity,
        inline: false,
      }
    )
    .setTimestamp()
}

export function createModelAnalyticsEmbed(
  color: number,
  translate: Translate,
  stats: Array<{
    model_name: string
    total_requests: number
    avg_response_time: number
    success_rate: number
  }>
) {
  const embed = new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.models.title'))
    .setColor(color)
    .setTimestamp()

  if (stats.length === 0) {
    embed.setDescription(translate('cmd.aianalytics.ui.models.empty'))
    return embed
  }

  for (const stat of stats.slice(0, 5)) {
    embed.addFields({
      name: stat.model_name,
      value: [
        translate('cmd.aianalytics.ui.models.requests', { total: stat.total_requests }),
        translate('cmd.aianalytics.ui.models.avg_time', {
          total: Math.round(stat.avg_response_time),
        }),
        translate('cmd.aianalytics.ui.models.success', {
          total: Math.round(stat.success_rate * 100),
        }),
      ].join('\n'),
      inline: true,
    })
  }

  return embed
}

export function createSentimentAnalyticsEmbed(
  color: number,
  translate: Translate,
  sentiment: { positive?: number; neutral?: number; negative?: number }
) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.sentiment.title'))
    .setColor(color)
    .addFields(
      {
        name: translate('cmd.aianalytics.ui.sentiment.positive'),
        value: String(sentiment.positive || 0),
        inline: true,
      },
      {
        name: translate('cmd.aianalytics.ui.sentiment.neutral'),
        value: String(sentiment.neutral || 0),
        inline: true,
      },
      {
        name: translate('cmd.aianalytics.ui.sentiment.negative'),
        value: String(sentiment.negative || 0),
        inline: true,
      }
    )
}

export function createSearchAnalyticsEmbed(color: number, translate: Translate, matches: string[]) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.search.title'))
    .setColor(color)
    .setDescription(
      matches.length > 0 ? matches.join('\n') : translate('cmd.aianalytics.ui.search.empty')
    )
}

export function createPatternAnalyticsEmbed(
  color: number,
  translate: Translate,
  topCommands: string[],
  patterns: string[]
) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.patterns.title'))
    .setColor(color)
    .addFields(
      {
        name: translate('cmd.aianalytics.ui.patterns.frequent_commands'),
        value:
          topCommands.length > 0 ? topCommands.join('\n') : translate('cmd.aianalytics.ui.no_data'),
        inline: false,
      },
      {
        name: translate('cmd.aianalytics.ui.patterns.learned_patterns'),
        value:
          patterns.length > 0
            ? patterns.join('\n')
            : translate('cmd.aianalytics.ui.patterns.empty'),
        inline: false,
      }
    )
}

export function createExportAnalyticsEmbed(
  color: number,
  translate: Translate,
  exportText: string
) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.aianalytics.ui.export.title'))
    .setColor(color)
    .setDescription(['```txt', exportText, '```'].join('\n'))
}

export function getAnalyticsDateFromPeriod(period: Period): Date | null {
  const now = Date.now()
  const map: Record<Exclude<Period, 'all'>, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }

  return period === 'all' ? null : new Date(now - map[period])
}

export function getAnalyticsPeriodLabel(translate: Translate, period: Period) {
  return translate(`cmd.aianalytics.ui.periods.${period}`)
}

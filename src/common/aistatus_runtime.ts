import { EmbedBuilder } from 'discord.js'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface AIStatusLike {
  initialized: boolean
  services: {
    nvidia: boolean
    context: boolean
    memory: boolean
  }
  features: string[]
}

interface AIStatisticsLike {
  totalInteractions: number
  contextStats: {
    totalContexts: number
    totalMessages: number
    contextsByChannel: Record<string, number>
  }
}

interface AIModelLike {
  name: string
  category: string
}

interface AIProviderLike {
  provider: string
  role: string
  status: 'ready' | 'off'
}

interface AILastRouteLike {
  provider: string
  model: string
}

export function createAIStatusEmbed(
  color: number,
  translate: Translate,
  status: AIStatusLike,
  stats: AIStatisticsLike,
  models: AIModelLike[] = [],
  capabilities: string[] = [],
  providers: AIProviderLike[] = [],
  lastRoute?: AILastRouteLike | null
) {
  const embed = new EmbedBuilder()
    .setTitle(translate('cmd.aistatus.ui.title'))
    .setColor(status.initialized ? color : 0xff0000)
    .setTimestamp()

  embed.addFields({
    name: translate('cmd.aistatus.ui.sections.service_status'),
    value: [
      translate('cmd.aistatus.ui.service_status.initialized', {
        value: status.initialized
          ? translate('cmd.aistatus.ui.values.yes')
          : translate('cmd.aistatus.ui.values.no'),
      }),
      translate('cmd.aistatus.ui.service_status.nvidia', {
        value: status.services.nvidia
          ? translate('cmd.aistatus.ui.values.active')
          : translate('cmd.aistatus.ui.values.inactive'),
      }),
      translate('cmd.aistatus.ui.service_status.context', {
        value: status.services.context
          ? translate('cmd.aistatus.ui.values.active')
          : translate('cmd.aistatus.ui.values.inactive'),
      }),
      translate('cmd.aistatus.ui.service_status.memory', {
        value: status.services.memory
          ? translate('cmd.aistatus.ui.values.active')
          : translate('cmd.aistatus.ui.values.inactive'),
      }),
    ].join('\n'),
    inline: false,
  })

  if (status.features.length > 0) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.features'),
      value: status.features.map((feature) => `• ${feature}`).join('\n'),
      inline: false,
    })
  }

  embed.addFields({
    name: translate('cmd.aistatus.ui.sections.usage'),
    value: [
      translate('cmd.aistatus.ui.usage.active_contexts', {
        total: stats.contextStats.totalContexts,
      }),
      translate('cmd.aistatus.ui.usage.total_messages', {
        total: stats.contextStats.totalMessages,
      }),
      translate('cmd.aistatus.ui.usage.total_users', {
        total: stats.totalInteractions,
      }),
    ].join('\n'),
    inline: true,
  })

  const topChannels = Object.entries(stats.contextStats.contextsByChannel)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)

  if (topChannels.length > 0) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.top_channels'),
      value: topChannels
        .map(([channelId, total]) =>
          translate('cmd.aistatus.ui.top_channels.item', { channelId, total })
        )
        .join('\n'),
      inline: true,
    })
  }

  if (models.length > 0) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.models'),
      value: models
        .slice(0, 5)
        .map((model) =>
          translate('cmd.aistatus.ui.models.item', { name: model.name, category: model.category })
        )
        .join('\n'),
      inline: false,
    })
  }

  if (capabilities.length > 0) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.capabilities'),
      value: capabilities.map((capability) => `• ${capability}`).join('\n'),
      inline: false,
    })
  }

  if (providers.length > 0) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.providers'),
      value: providers
        .map(
          (provider) =>
            `${provider.status === 'ready' ? '✅' : '⚪'} ${provider.provider} · ${provider.role}`
        )
        .join('\n'),
      inline: false,
    })
  }

  if (lastRoute) {
    embed.addFields({
      name: translate('cmd.aistatus.ui.sections.last_route'),
      value: translate('cmd.aistatus.ui.last_route.item', {
        provider: lastRoute.provider,
        model: lastRoute.model,
      }),
      inline: false,
    })
  }

  embed.addFields({
    name: translate('cmd.aistatus.ui.sections.health'),
    value: createAIHealthStatusSummary(translate, status, stats),
    inline: false,
  })

  return embed
}

export function createAIHealthStatusSummary(
  translate: Translate,
  status: AIStatusLike,
  stats: AIStatisticsLike
) {
  const checks = [
    status.initialized
      ? translate('cmd.aistatus.ui.health.checks.core_ready')
      : translate('cmd.aistatus.ui.health.checks.core_not_ready'),
    status.services.nvidia
      ? translate('cmd.aistatus.ui.health.checks.model_ready')
      : translate('cmd.aistatus.ui.health.checks.model_unavailable'),
    stats.contextStats.totalContexts > 100
      ? translate('cmd.aistatus.ui.health.checks.memory_high')
      : translate('cmd.aistatus.ui.health.checks.memory_normal'),
  ]

  const healthScore = checks.filter((check) => check.startsWith('✅')).length / checks.length

  let overall = translate('cmd.aistatus.ui.health.overall.poor')
  if (healthScore === 1) overall = translate('cmd.aistatus.ui.health.overall.excellent')
  else if (healthScore >= 0.7) overall = translate('cmd.aistatus.ui.health.overall.good')
  else if (healthScore >= 0.5) overall = translate('cmd.aistatus.ui.health.overall.fair')

  return [...checks, '', overall].join('\n')
}

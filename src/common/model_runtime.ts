import { EmbedBuilder } from 'discord.js'

type Translate = (key: string, params?: Record<string, unknown>) => string

interface AIModelLike {
  id: string
  name: string
  description: string
  category: string
  contextLength: number
  maxTokens: number
  temperature: number
  topP: number
  streaming?: boolean
  features?: string[]
  costPerMillion?: string
  latency?: string
}

interface ModelStatsLike {
  model_name: string
  total_requests: number
  total_tokens: number | string
  avg_response_time: number
  success_rate: number
}

export function createFilteredModelListEmbed(
  color: number,
  translate: Translate,
  category: string,
  models: AIModelLike[]
) {
  const embed = new EmbedBuilder()
    .setTitle(translate('cmd.model.ui.list.title', { category }))
    .setColor(color)
    .setTimestamp()

  if (models.length === 0) {
    embed.setDescription(translate('cmd.model.ui.list.empty_category'))
    return embed
  }

  for (const model of models) {
    embed.addFields({
      name: model.name,
      value: translate('cmd.model.ui.list.item', {
        description: model.description,
        contextLength: model.contextLength.toLocaleString(),
      }),
      inline: false,
    })
  }

  return embed
}

export function createSelectedModelEmbed(color: number, translate: Translate, model: AIModelLike) {
  return new EmbedBuilder()
    .setTitle(translate('cmd.model.ui.select.title'))
    .setDescription(translate('cmd.model.ui.select.description', { model: model.name }))
    .setColor(color)
    .addFields(
      { name: translate('cmd.model.ui.fields.category'), value: model.category, inline: true },
      {
        name: translate('cmd.model.ui.fields.context'),
        value: `${model.contextLength.toLocaleString()} tokens`,
        inline: true,
      },
      {
        name: translate('cmd.model.ui.fields.streaming'),
        value: model.streaming
          ? translate('cmd.model.ui.streaming.enabled')
          : translate('cmd.model.ui.streaming.disabled'),
        inline: true,
      }
    )
    .setFooter({ text: translate('cmd.model.ui.select.footer') })
}

export function createModelInfoEmbed(color: number, translate: Translate, model: AIModelLike) {
  const embed = new EmbedBuilder()
    .setTitle(`🤖 ${model.name}`)
    .setDescription(model.description)
    .setColor(color)
    .addFields(
      { name: translate('cmd.model.ui.fields.model_id'), value: `\`${model.id}\``, inline: false },
      { name: translate('cmd.model.ui.fields.category'), value: model.category, inline: true },
      {
        name: translate('cmd.model.ui.fields.context'),
        value: `${model.contextLength.toLocaleString()} tokens`,
        inline: true,
      },
      {
        name: translate('cmd.model.ui.fields.max_tokens'),
        value: `${model.maxTokens.toLocaleString()}`,
        inline: true,
      },
      {
        name: translate('cmd.model.ui.fields.temperature'),
        value: `${model.temperature}`,
        inline: true,
      },
      { name: translate('cmd.model.ui.fields.top_p'), value: `${model.topP}`, inline: true },
      {
        name: translate('cmd.model.ui.fields.streaming'),
        value: model.streaming
          ? translate('cmd.model.ui.streaming.supported')
          : translate('cmd.model.ui.streaming.unsupported'),
        inline: true,
      }
    )

  if (model.features && model.features.length > 0) {
    embed.addFields({
      name: translate('cmd.model.ui.fields.features'),
      value: model.features.map((feature) => `• ${feature}`).join('\n'),
      inline: false,
    })
  }

  if (model.costPerMillion) {
    embed.addFields({
      name: translate('cmd.model.ui.fields.cost'),
      value: translate('cmd.model.ui.cost_value', { cost: model.costPerMillion }),
      inline: true,
    })
  }

  if (model.latency) {
    embed.addFields({
      name: translate('cmd.model.ui.fields.latency'),
      value: model.latency,
      inline: true,
    })
  }

  return embed
}

export function createModelStatsEmbed(
  color: number,
  translate: Translate,
  period: string,
  stats: ModelStatsLike[]
) {
  const embed = new EmbedBuilder()
    .setTitle(translate('cmd.model.ui.stats.title', { period }))
    .setColor(color)
    .setDescription(translate('cmd.model.ui.stats.description'))
    .setTimestamp()

  if (Array.isArray(stats) && stats.length > 0) {
    for (const stat of stats.slice(0, 10)) {
      embed.addFields({
        name: stat.model_name,
        value: [
          translate('cmd.model.ui.stats.requests', { total: stat.total_requests }),
          translate('cmd.model.ui.stats.tokens', {
            total: Number(stat.total_tokens).toLocaleString(),
          }),
          translate('cmd.model.ui.stats.avg_time', {
            time: Math.round(stat.avg_response_time),
          }),
          translate('cmd.model.ui.stats.success_rate', {
            rate: Math.round(stat.success_rate * 100),
          }),
        ].join(' | '),
        inline: false,
      })
    }
  } else {
    embed.setDescription(translate('cmd.model.ui.stats.empty'))
  }

  return embed
}

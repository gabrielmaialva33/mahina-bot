import Command from '#common/command'
import {
  getAIServiceCapabilities,
  getAllAvailableAIModels,
  getPreferredAIService,
} from '#common/ai_runtime'
import { EmbedBuilder } from 'discord.js'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

export default class AIStatus extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aistatus',
      description: {
        content: 'Verificar status e estatísticas dos serviços de IA',
        examples: ['aistatus'],
        usage: 'aistatus',
      },
      category: 'ai',
      aliases: ['ai-status', 'statusai', 'iainfo'],
      cooldown: 5,
      args: false,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    if (!client.aiManager) {
      return await ctx.sendMessage({
        embeds: [
          {
            title: t('cmd.aistatus.ui.errors.manager_unavailable_title'),
            description: t('cmd.aistatus.ui.errors.manager_unavailable'),
            color: client.config.color.red,
          },
        ],
      })
    }

    await ctx.sendDeferMessage(t('cmd.aistatus.ui.loading'))

    try {
      // Get AI Manager status
      const status = client.aiManager.getStatus()
      const stats = await client.aiManager.getStatistics()

      // Create status embed
      const statusEmbed = new EmbedBuilder()
        .setTitle(t('cmd.aistatus.ui.title'))
        .setColor(status.initialized ? client.config.color.green : client.config.color.red)
        .setTimestamp()

      // Service Status
      statusEmbed.addFields({
        name: t('cmd.aistatus.ui.sections.service_status'),
        value: [
          t('cmd.aistatus.ui.service_status.initialized', {
            value: status.initialized
              ? t('cmd.aistatus.ui.values.yes')
              : t('cmd.aistatus.ui.values.no'),
          }),
          t('cmd.aistatus.ui.service_status.nvidia', {
            value: status.services.nvidia
              ? t('cmd.aistatus.ui.values.active')
              : t('cmd.aistatus.ui.values.inactive'),
          }),
          t('cmd.aistatus.ui.service_status.context', {
            value: status.services.context
              ? t('cmd.aistatus.ui.values.active')
              : t('cmd.aistatus.ui.values.inactive'),
          }),
          t('cmd.aistatus.ui.service_status.memory', {
            value: status.services.memory
              ? t('cmd.aistatus.ui.values.active')
              : t('cmd.aistatus.ui.values.inactive'),
          }),
        ].join('\n'),
        inline: false,
      })

      // Available Features
      if (status.features.length > 0) {
        statusEmbed.addFields({
          name: t('cmd.aistatus.ui.sections.features'),
          value: status.features.map((f) => `• ${f}`).join('\n'),
          inline: false,
        })
      }

      // Statistics
      statusEmbed.addFields({
        name: t('cmd.aistatus.ui.sections.usage'),
        value: [
          t('cmd.aistatus.ui.usage.active_contexts', { total: stats.contextStats.totalContexts }),
          t('cmd.aistatus.ui.usage.total_messages', { total: stats.contextStats.totalMessages }),
          t('cmd.aistatus.ui.usage.total_users', { total: stats.totalInteractions }),
        ].join('\n'),
        inline: true,
      })

      // Channel Usage
      const topChannels = Object.entries(stats.contextStats.contextsByChannel)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)

      if (topChannels.length > 0) {
        statusEmbed.addFields({
          name: t('cmd.aistatus.ui.sections.top_channels'),
          value: topChannels
            .map(([channelId, count]) =>
              t('cmd.aistatus.ui.top_channels.item', { channelId, total: count as number })
            )
            .join('\n'),
          inline: true,
        })
      }

      // Models info if NVIDIA is active
      const aiService = getPreferredAIService(client)
      if (aiService) {
        const models = getAllAvailableAIModels(client)
        const capabilities = [...getAIServiceCapabilities(aiService)].map(
          (capability) => `• ${capability}`
        )
        statusEmbed.addFields({
          name: t('cmd.aistatus.ui.sections.models'),
          value: models
            .slice(0, 5)
            .map((m) => `• **${m.name}** (${m.category})`)
            .join('\n'),
          inline: false,
        })

        if (capabilities.length > 0) {
          statusEmbed.addFields({
            name: t('cmd.aistatus.ui.sections.capabilities'),
            value: capabilities.join('\n'),
            inline: false,
          })
        }
      }

      // Health check
      const healthStatus = this.getHealthStatus(status, stats)
      statusEmbed.addFields({
        name: t('cmd.aistatus.ui.sections.health'),
        value: healthStatus,
        inline: false,
      })

      await ctx.editMessage({ embeds: [statusEmbed] })
    } catch (error) {
      console.error('AI Status error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: t('cmd.aistatus.ui.errors.generic_title'),
            description: t('cmd.aistatus.ui.errors.generic'),
            fields: [
              {
                name: t('cmd.aistatus.ui.errors.error_field'),
                value: (error as Error).message || t('cmd.aistatus.ui.errors.unknown'),
              },
            ],
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private getHealthStatus(status: any, stats: any): string {
    const t = this.client.i18n.__.bind(this.client.i18n)
    const checks = []

    // Service checks
    if (status.initialized) {
      checks.push(t('cmd.aistatus.ui.health.checks.core_ready'))
    } else {
      checks.push(t('cmd.aistatus.ui.health.checks.core_not_ready'))
    }

    if (status.services.nvidia) {
      checks.push(t('cmd.aistatus.ui.health.checks.model_ready'))
    } else {
      checks.push(t('cmd.aistatus.ui.health.checks.model_unavailable'))
    }

    // Performance checks
    if (stats.contextStats.totalContexts > 100) {
      checks.push(t('cmd.aistatus.ui.health.checks.memory_high'))
    } else {
      checks.push(t('cmd.aistatus.ui.health.checks.memory_normal'))
    }

    // Overall status
    const healthScore = checks.filter((c) => c.startsWith('✅')).length / checks.length

    if (healthScore === 1) {
      checks.push('')
      checks.push(t('cmd.aistatus.ui.health.overall.excellent'))
    } else if (healthScore >= 0.7) {
      checks.push('')
      checks.push(t('cmd.aistatus.ui.health.overall.good'))
    } else if (healthScore >= 0.5) {
      checks.push('')
      checks.push(t('cmd.aistatus.ui.health.overall.fair'))
    } else {
      checks.push('')
      checks.push(t('cmd.aistatus.ui.health.overall.poor'))
    }

    return checks.join('\n')
  }
}

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
        name: '📊 Status dos Serviços',
        value: [
          t('cmd.aistatus.ui.service_status.initialized', {
            value: status.initialized ? '✅ Sim' : '❌ Não',
          }),
          t('cmd.aistatus.ui.service_status.nvidia', {
            value: status.services.nvidia ? '✅ Ativo' : '❌ Inativo',
          }),
          t('cmd.aistatus.ui.service_status.context', {
            value: status.services.context ? '✅ Ativo' : '❌ Inativo',
          }),
          t('cmd.aistatus.ui.service_status.memory', {
            value: status.services.memory ? '✅ Ativo' : '❌ Inativo',
          }),
        ].join('\n'),
        inline: false,
      })

      // Available Features
      if (status.features.length > 0) {
        statusEmbed.addFields({
          name: '✨ Recursos Disponíveis',
          value: status.features.map((f) => `• ${f}`).join('\n'),
          inline: false,
        })
      }

      // Statistics
      statusEmbed.addFields({
        name: '📈 Estatísticas de Uso',
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
          name: '🔥 Canais Principais',
          value: topChannels
            .map(([channelId, count]) => `<#${channelId}>: ${count} contextos`)
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
          name: '🧠 Modelos Disponíveis',
          value: models
            .slice(0, 5)
            .map((m) => `• **${m.name}** (${m.category})`)
            .join('\n'),
          inline: false,
        })

        if (capabilities.length > 0) {
          statusEmbed.addFields({
            name: '🛠️ Capacidades Ativas',
            value: capabilities.join('\n'),
            inline: false,
          })
        }
      }

      // Health check
      const healthStatus = this.getHealthStatus(status, stats)
      statusEmbed.addFields({
        name: '💚 Status de Saúde',
        value: healthStatus,
        inline: false,
      })

      await ctx.editMessage({ embeds: [statusEmbed] })
    } catch (error) {
      console.error('AI Status error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro',
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
    const checks = []

    // Service checks
    if (status.initialized) {
      checks.push('✅ Serviços principais inicializados')
    } else {
      checks.push('❌ Serviços principais não inicializados')
    }

    if (status.services.nvidia) {
      checks.push('✅ Serviço de modelo de IA saudável')
    } else {
      checks.push('⚠️ Serviço de modelo de IA indisponível')
    }

    // Performance checks
    if (stats.contextStats.totalContexts > 100) {
      checks.push('⚠️ Alto uso de memória detectado')
    } else {
      checks.push('✅ Uso de memória normal')
    }

    // Overall status
    const healthScore = checks.filter((c) => c.startsWith('✅')).length / checks.length

    if (healthScore === 1) {
      checks.push('\n**Geral:** 🟢 Excelente')
    } else if (healthScore >= 0.7) {
      checks.push('\n**Geral:** 🟡 Bom')
    } else if (healthScore >= 0.5) {
      checks.push('\n**Geral:** 🟠 Regular')
    } else {
      checks.push('\n**Geral:** 🔴 Ruim')
    }

    return checks.join('\n')
  }
}

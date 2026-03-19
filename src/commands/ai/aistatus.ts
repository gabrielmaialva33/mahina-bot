import Command from '#common/command'
import {
  getAIServiceCapabilities,
  getAllAvailableAIModels,
  getPreferredAIService,
} from '#common/ai_runtime'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createAIHealthStatusSummary, createAIStatusEmbed } from '#common/aistatus_runtime'

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

  async run(client: MahinaBot, ctx: Context): Promise<void> {
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
      const status = client.aiManager.getStatus()
      const stats = await client.aiManager.getStatistics()
      const aiService = getPreferredAIService(client)
      const models = aiService ? getAllAvailableAIModels(client) : []
      const capabilities = aiService ? [...getAIServiceCapabilities(aiService)] : []

      await ctx.editMessage({
        embeds: [
          createAIStatusEmbed(client.config.color.green, t, status, stats, models, capabilities),
        ],
      })
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
}

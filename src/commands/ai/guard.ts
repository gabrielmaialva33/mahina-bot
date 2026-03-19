import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import type { ContentSafetyResponse, NvidiaGuardService } from '#src/services/nvidia_guard_service'
import { ApplicationCommandOptionType, EmbedBuilder, Message, MessageFlags } from 'discord.js'

export default class GuardCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'guard',
      description: {
        content: 'Testa e configura sistemas de segurança NVIDIA NemoGuard',
        examples: ['guard check Esta é uma mensagem normal', 'guard stats', 'guard test jailbreak'],
        usage: 'guard <ação> [texto]',
      },
      category: 'ai',
      aliases: ['safety', 'security', 'moderation'],
      cooldown: 10,
      args: true,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: ['ManageMessages'], // Require moderation permissions
      },
      slashCommand: true,
      options: [
        {
          name: 'acao',
          description: 'Ação a ser executada',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '🔍 Verificar Texto', value: 'check' },
            { name: '📊 Estatísticas', value: 'stats' },
            { name: '🧪 Teste de Jailbreak', value: 'test_jailbreak' },
            { name: '🛡️ Teste de Segurança', value: 'test_safety' },
            { name: '📋 Tópicos Permitidos', value: 'topics' },
          ],
        },
        {
          name: 'texto',
          description: 'Texto para verificar (obrigatório para verificações)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'modo_estrito',
          description: 'Usar modo estrito para verificação de tópicos',
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    // Parse arguments
    let action: string
    let text: string
    let strictMode: boolean

    if (ctx.isInteraction) {
      action = ctx.options.get('acao')?.value as string
      text = (ctx.options.get('texto')?.value as string) || ''
      strictMode = (ctx.options.get('modo_estrito')?.value as boolean) || false
    } else {
      action = args[0]
      text = args.slice(1).join(' ')
      strictMode = false
    }

    if (!action) {
      return await ctx.sendMessage({
        embeds: [
          {
            title: t('cmd.guard.ui.help.title'),
            description: t('cmd.guard.ui.help.description'),
            fields: [
              {
                name: t('cmd.guard.ui.help.check_name'),
                value: t('cmd.guard.ui.help.check_value'),
                inline: false,
              },
              {
                name: t('cmd.guard.ui.help.stats_name'),
                value: t('cmd.guard.ui.help.stats_value'),
                inline: false,
              },
              {
                name: t('cmd.guard.ui.help.tests_name'),
                value: t('cmd.guard.ui.help.tests_value'),
                inline: false,
              },
            ],
            color: client.config.color.main,
          },
        ],
      })
    }

    // Get Guard service
    const guardService = client.services.nvidiaGuard
    if (!guardService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.guard.ui.errors.service_unavailable'),
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (!guardService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: t('cmd.guard.ui.errors.not_configured'),
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Handle different actions
    switch (action) {
      case 'stats':
        await this.handleStats(ctx, guardService, client)
        break

      case 'topics':
        await this.handleTopics(ctx, guardService, client)
        break

      case 'check':
        if (!text) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.guard.ui.errors.missing_text_check'),
                color: client.config.color.red,
              },
            ],
            flags: MessageFlags.Ephemeral,
          })
        }
        await this.handleComprehensiveCheck(ctx, guardService, client, text, strictMode)
        break

      case 'test_jailbreak':
        if (!text) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.guard.ui.errors.missing_text_test'),
                color: client.config.color.red,
              },
            ],
            flags: MessageFlags.Ephemeral,
          })
        }
        await this.handleJailbreakTest(ctx, guardService, client, text)
        break

      case 'test_safety':
        if (!text) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: t('cmd.guard.ui.errors.missing_text_test'),
                color: client.config.color.red,
              },
            ],
            flags: MessageFlags.Ephemeral,
          })
        }
        await this.handleSafetyTest(ctx, guardService, client, text)
        break

      default:
        return await ctx.sendMessage({
          embeds: [
            {
              description: t('cmd.guard.ui.errors.invalid_action'),
              color: client.config.color.red,
            },
          ],
          flags: MessageFlags.Ephemeral,
        })
    }
  }

  private async handleStats(
    ctx: Context,
    guardService: NvidiaGuardService,
    client: MahinaBot
  ): Promise<Message | void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const stats = guardService.getGuardStats()

    const embed = new EmbedBuilder()
      .setColor(client.config.color.blue)
      .setTitle(t('cmd.guard.ui.stats.title'))
      .setDescription(t('cmd.guard.ui.stats.description'))
      .addFields(
        {
          name: t('cmd.guard.ui.stats.models'),
          value: stats.models.map((model: string) => `• ${model}`).join('\n'),
          inline: false,
        },
        {
          name: t('cmd.guard.ui.stats.features'),
          value: stats.features.map((feature: string) => `• ${feature}`).join('\n'),
          inline: false,
        },
        {
          name: t('cmd.guard.ui.stats.status'),
          value: stats.availability
            ? t('cmd.guard.ui.values.available')
            : t('cmd.guard.ui.values.unavailable'),
          inline: true,
        }
      )
      .setFooter({
        text: t('cmd.guard.ui.stats.footer', { user: ctx.author.username }),
        iconURL: ctx.author.avatarURL() || undefined,
      })
      .setTimestamp()

    return await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleTopics(
    ctx: Context,
    guardService: NvidiaGuardService,
    client: MahinaBot
  ): Promise<Message | void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const allowedTopics = guardService.getMusicAllowedTopics()

    const embed = new EmbedBuilder()
      .setColor(client.config.color.green)
      .setTitle(t('cmd.guard.ui.topics.title'))
      .setDescription(t('cmd.guard.ui.topics.description'))
      .addFields({
        name: t('cmd.guard.ui.topics.allowed'),
        value: allowedTopics.map((topic: string) => `• ${topic}`).join('\n'),
        inline: false,
      })
      .setFooter({
        text: t('cmd.guard.ui.topics.footer', { total: allowedTopics.length }),
        iconURL: ctx.author.avatarURL() || undefined,
      })
      .setTimestamp()

    return await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleComprehensiveCheck(
    ctx: Context,
    guardService: NvidiaGuardService,
    client: MahinaBot,
    text: string,
    strictMode: boolean
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription(t('cmd.guard.ui.check.loading'))
      .addFields(
        { name: t('cmd.guard.ui.check.text'), value: text.substring(0, 500), inline: false },
        {
          name: t('cmd.guard.ui.check.mode'),
          value: strictMode ? t('cmd.guard.ui.values.strict') : t('cmd.guard.ui.values.normal'),
          inline: true,
        }
      )

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.comprehensiveSafetyCheck(text, {
        allowedTopics: guardService.getMusicAllowedTopics(),
        strictMode,
      })

      const resultEmbed = new EmbedBuilder()
        .setColor(result.is_safe ? client.config.color.green : client.config.color.red)
        .setTitle(t('cmd.guard.ui.check.result_title'))
        .setDescription(
          t('cmd.guard.ui.check.result_status', {
            status: result.is_safe
              ? t('cmd.guard.ui.values.safe')
              : t('cmd.guard.ui.values.risk_detected'),
          })
        )
        .addFields(
          {
            name: t('cmd.guard.ui.check.risk'),
            value: this.getRiskEmoji(result.overall_risk) + ' ' + result.overall_risk.toUpperCase(),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.check.action'),
            value: this.getActionEmoji(result.action) + ' ' + result.action.toUpperCase(),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.check.jailbreak'),
            value: result.jailbreak_risk
              ? t('cmd.guard.ui.values.detected')
              : t('cmd.guard.ui.values.not_detected'),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.check.content'),
            value: result.content_violations
              ? t('cmd.guard.ui.values.violations_found')
              : t('cmd.guard.ui.values.approved'),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.check.topics'),
            value: result.topic_violations
              ? t('cmd.guard.ui.values.out_of_scope')
              : t('cmd.guard.ui.values.appropriate'),
            inline: true,
          }
        )

      // Add detailed results if available
      if (result.details.jailbreak && result.jailbreak_risk) {
        const jailbreak = result.details.jailbreak
        resultEmbed.addFields({
          name: t('cmd.guard.ui.check.jailbreak_details'),
          value: t('cmd.guard.ui.check.jailbreak_details_value', {
            confidence: Math.round(jailbreak.confidence * 100),
            techniques: jailbreak.techniques_detected.join(', ') || 'N/A',
          }),
          inline: false,
        })
      }

      if (result.details.content && result.content_violations) {
        const violations = result.details.content.content_policy_violations
        if (violations.length > 0) {
          resultEmbed.addFields({
            name: t('cmd.guard.ui.check.content_violations'),
            value: violations
              .map(
                (v: ContentSafetyResponse['content_policy_violations'][number]) =>
                  `• **${v.policy}:** ${v.violation_type} (${v.severity})`
              )
              .join('\n'),
            inline: false,
          })
        }
      }

      resultEmbed
        .setFooter({
          text: t('cmd.guard.ui.check.footer', { user: ctx.author.username }),
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [resultEmbed] })
    } catch (error) {
      console.error('Guard check error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: t('cmd.guard.ui.errors.analysis_title'),
            description: t('cmd.guard.ui.errors.analysis'),
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async handleJailbreakTest(
    ctx: Context,
    guardService: NvidiaGuardService,
    client: MahinaBot,
    text: string
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription(t('cmd.guard.ui.jailbreak.loading'))

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.detectJailbreak(text)

      if (!result) {
        return await ctx.editMessage({
          embeds: [
            {
              description: t('cmd.guard.ui.errors.jailbreak'),
              color: client.config.color.red,
            },
          ],
        })
      }

      const embed = new EmbedBuilder()
        .setColor(result.is_jailbreak ? client.config.color.red : client.config.color.green)
        .setTitle(t('cmd.guard.ui.jailbreak.title'))
        .addFields(
          {
            name: t('cmd.guard.ui.jailbreak.result'),
            value: result.is_jailbreak
              ? t('cmd.guard.ui.values.jailbreak_detected')
              : t('cmd.guard.ui.values.safe_text'),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.jailbreak.confidence'),
            value: `${Math.round(result.confidence * 100)}%`,
            inline: true,
          },
          {
            name: t('cmd.guard.ui.jailbreak.risk'),
            value:
              this.getRiskEmoji(result.risk_assessment) +
              ' ' +
              result.risk_assessment.toUpperCase(),
            inline: true,
          }
        )

      if (result.techniques_detected && result.techniques_detected.length > 0) {
        embed.addFields({
          name: t('cmd.guard.ui.jailbreak.techniques'),
          value: result.techniques_detected.map((tech: string) => `• ${tech}`).join('\n'),
          inline: false,
        })
      }

      embed
        .setFooter({
          text: t('cmd.guard.ui.jailbreak.footer', { user: ctx.author.username }),
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [embed] })
    } catch (error) {
      console.error('Jailbreak test error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: t('cmd.guard.ui.errors.test_title'),
            description: t('cmd.guard.ui.errors.jailbreak_test'),
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async handleSafetyTest(
    ctx: Context,
    guardService: NvidiaGuardService,
    client: MahinaBot,
    text: string
  ): Promise<void> {
    const t = (key: string, params?: Record<string, unknown>) => ctx.locale(key, params)
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription(t('cmd.guard.ui.safety.loading'))

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.checkContentSafety(text)

      if (!result) {
        return await ctx.editMessage({
          embeds: [
            {
              description: t('cmd.guard.ui.errors.safety'),
              color: client.config.color.red,
            },
          ],
        })
      }

      const embed = new EmbedBuilder()
        .setColor(result.is_safe ? client.config.color.green : client.config.color.red)
        .setTitle(t('cmd.guard.ui.safety.title'))
        .addFields(
          {
            name: t('cmd.guard.ui.safety.result'),
            value: result.is_safe
              ? t('cmd.guard.ui.values.safe_content')
              : t('cmd.guard.ui.values.violations_detected'),
            inline: true,
          },
          {
            name: t('cmd.guard.ui.safety.recommendation'),
            value:
              this.getRecommendationEmoji(result.recommendation) +
              ' ' +
              result.recommendation.toUpperCase(),
            inline: true,
          }
        )

      if (result.content_policy_violations && result.content_policy_violations.length > 0) {
        embed.addFields({
          name: t('cmd.guard.ui.safety.violations'),
          value: result.content_policy_violations
            .map(
              (v: ContentSafetyResponse['content_policy_violations'][number]) =>
                `• **${v.policy}:** ${v.violation_type} (${v.severity}) - Score: ${Math.round(v.score * 100)}%`
            )
            .join('\n'),
          inline: false,
        })
      }

      embed
        .setFooter({
          text: t('cmd.guard.ui.safety.footer', { user: ctx.author.username }),
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [embed] })
    } catch (error) {
      console.error('Safety test error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: t('cmd.guard.ui.errors.test_title'),
            description: t('cmd.guard.ui.errors.safety_test'),
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private getRiskEmoji(risk: string): string {
    switch (risk) {
      case 'low':
        return '🟢'
      case 'medium':
        return '🟡'
      case 'high':
        return '🔴'
      default:
        return '⚪'
    }
  }

  private getActionEmoji(action: string): string {
    switch (action) {
      case 'allow':
        return '✅'
      case 'warn':
        return '⚠️'
      case 'block':
        return '🚫'
      default:
        return '❓'
    }
  }

  private getRecommendationEmoji(recommendation: string): string {
    switch (recommendation) {
      case 'approve':
        return '✅'
      case 'review':
        return '👁️'
      case 'reject':
        return '❌'
      default:
        return '❓'
    }
  }
}

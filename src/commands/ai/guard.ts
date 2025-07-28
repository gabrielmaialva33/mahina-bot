import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } from 'discord.js'

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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
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
            title: '🛡️ NVIDIA NemoGuard',
            description: 'Sistema de segurança e moderação de IA',
            fields: [
              {
                name: '🔍 Verificar Texto',
                value: '`!guard check <texto>` - Analisa a segurança de um texto',
                inline: false,
              },
              {
                name: '📊 Estatísticas',
                value: '`!guard stats` - Mostra estatísticas dos sistemas de segurança',
                inline: false,
              },
              {
                name: '🧪 Testes',
                value: '`!guard test_jailbreak <texto>` - Testa detecção de jailbreak',
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
            description: '❌ Serviço de segurança não está disponível.',
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
            description: '❌ Serviço NemoGuard não está configurado. Configure NVIDIA_API_KEY.',
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
                description: '❌ Por favor, forneça um texto para verificar!',
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
                description: '❌ Por favor, forneça um texto para testar!',
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
                description: '❌ Por favor, forneça um texto para testar!',
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
              description:
                '❌ Ação inválida! Use: check, stats, test_jailbreak, test_safety, ou topics.',
              color: client.config.color.red,
            },
          ],
          flags: MessageFlags.Ephemeral,
        })
    }
  }

  private async handleStats(ctx: Context, guardService: any, client: MahinaBot): Promise<any> {
    const stats = guardService.getGuardStats()

    const embed = new EmbedBuilder()
      .setColor(client.config.color.blue)
      .setTitle('📊 Estatísticas do NemoGuard')
      .setDescription('Sistema de segurança e moderação de IA')
      .addFields(
        {
          name: '🤖 Modelos Disponíveis',
          value: stats.models.map((model: string) => `• ${model}`).join('\n'),
          inline: false,
        },
        {
          name: '🛡️ Recursos',
          value: stats.features.map((feature: string) => `• ${feature}`).join('\n'),
          inline: false,
        },
        {
          name: '📈 Status',
          value: stats.availability ? '✅ Operacional' : '❌ Indisponível',
          inline: true,
        }
      )
      .setFooter({
        text: `Solicitado por ${ctx.author.username} • NVIDIA NemoGuard`,
        iconURL: ctx.author.avatarURL() || undefined,
      })
      .setTimestamp()

    return await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleTopics(ctx: Context, guardService: any, client: MahinaBot): Promise<any> {
    const allowedTopics = guardService.getMusicAllowedTopics()

    const embed = new EmbedBuilder()
      .setColor(client.config.color.green)
      .setTitle('📋 Tópicos Permitidos')
      .setDescription('Lista de tópicos aprovados para conversas com IA')
      .addFields({
        name: '✅ Tópicos Aprovados',
        value: allowedTopics.map((topic: string) => `• ${topic}`).join('\n'),
        inline: false,
      })
      .setFooter({
        text: `${allowedTopics.length} tópicos configurados • Controle de Tópicos`,
        iconURL: ctx.author.avatarURL() || undefined,
      })
      .setTimestamp()

    return await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleComprehensiveCheck(
    ctx: Context,
    guardService: any,
    client: MahinaBot,
    text: string,
    strictMode: boolean
  ): Promise<any> {
    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription('🔍 Analisando segurança do texto...')
      .addFields(
        { name: '📝 Texto', value: text.substring(0, 500), inline: false },
        { name: '⚙️ Modo', value: strictMode ? 'Estrito' : 'Normal', inline: true }
      )

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.comprehensiveSafetyCheck(text, {
        allowedTopics: guardService.getMusicAllowedTopics(),
        strictMode,
      })

      const resultEmbed = new EmbedBuilder()
        .setColor(result.is_safe ? client.config.color.green : client.config.color.red)
        .setTitle(`🛡️ Resultado da Análise de Segurança`)
        .setDescription(`**Status:** ${result.is_safe ? '✅ Seguro' : '⚠️ Risco Detectado'}`)
        .addFields(
          {
            name: '📊 Nível de Risco',
            value: this.getRiskEmoji(result.overall_risk) + ' ' + result.overall_risk.toUpperCase(),
            inline: true,
          },
          {
            name: '🎯 Ação Recomendada',
            value: this.getActionEmoji(result.action) + ' ' + result.action.toUpperCase(),
            inline: true,
          },
          {
            name: '🧪 Jailbreak',
            value: result.jailbreak_risk ? '❌ Detectado' : '✅ Não detectado',
            inline: true,
          },
          {
            name: '📋 Conteúdo',
            value: result.content_violations ? '❌ Violações encontradas' : '✅ Aprovado',
            inline: true,
          },
          {
            name: '💭 Tópicos',
            value: result.topic_violations ? '❌ Fora do escopo' : '✅ Apropriado',
            inline: true,
          }
        )

      // Add detailed results if available
      if (result.details.jailbreak && result.jailbreak_risk) {
        const jailbreak = result.details.jailbreak
        resultEmbed.addFields({
          name: '🚨 Detalhes do Jailbreak',
          value: `**Confiança:** ${Math.round(jailbreak.confidence * 100)}%\n**Técnicas:** ${jailbreak.techniques_detected.join(', ') || 'N/A'}`,
          inline: false,
        })
      }

      if (result.details.content && result.content_violations) {
        const violations = result.details.content.content_policy_violations
        if (violations.length > 0) {
          resultEmbed.addFields({
            name: '⚠️ Violações de Conteúdo',
            value: violations
              .map((v: any) => `• **${v.policy}:** ${v.violation_type} (${v.severity})`)
              .join('\n'),
            inline: false,
          })
        }
      }

      resultEmbed
        .setFooter({
          text: `Analisado por ${ctx.author.username} • NemoGuard Security`,
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [resultEmbed] })
    } catch (error) {
      console.error('Guard check error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro na análise',
            description: 'Ocorreu um erro durante a análise de segurança.',
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async handleJailbreakTest(
    ctx: Context,
    guardService: any,
    client: MahinaBot,
    text: string
  ): Promise<any> {
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription('🧪 Testando detecção de jailbreak...')

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.detectJailbreak(text)

      if (!result) {
        return await ctx.editMessage({
          embeds: [
            {
              description: '❌ Erro ao executar teste de jailbreak.',
              color: client.config.color.red,
            },
          ],
        })
      }

      const embed = new EmbedBuilder()
        .setColor(result.is_jailbreak ? client.config.color.red : client.config.color.green)
        .setTitle('🧪 Teste de Detecção de Jailbreak')
        .addFields(
          {
            name: '🎯 Resultado',
            value: result.is_jailbreak ? '❌ Jailbreak detectado' : '✅ Texto seguro',
            inline: true,
          },
          { name: '📊 Confiança', value: `${Math.round(result.confidence * 100)}%`, inline: true },
          {
            name: '⚠️ Risco',
            value:
              this.getRiskEmoji(result.risk_assessment) +
              ' ' +
              result.risk_assessment.toUpperCase(),
            inline: true,
          }
        )

      if (result.techniques_detected && result.techniques_detected.length > 0) {
        embed.addFields({
          name: '🔍 Técnicas Detectadas',
          value: result.techniques_detected.map((tech: string) => `• ${tech}`).join('\n'),
          inline: false,
        })
      }

      embed
        .setFooter({
          text: `Teste realizado por ${ctx.author.username} • Jailbreak Detection`,
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [embed] })
    } catch (error) {
      console.error('Jailbreak test error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro no teste',
            description: 'Ocorreu um erro durante o teste de jailbreak.',
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private async handleSafetyTest(
    ctx: Context,
    guardService: any,
    client: MahinaBot,
    text: string
  ): Promise<any> {
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription('🛡️ Testando segurança de conteúdo...')

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      const result = await guardService.checkContentSafety(text)

      if (!result) {
        return await ctx.editMessage({
          embeds: [
            {
              description: '❌ Erro ao executar teste de segurança.',
              color: client.config.color.red,
            },
          ],
        })
      }

      const embed = new EmbedBuilder()
        .setColor(result.is_safe ? client.config.color.green : client.config.color.red)
        .setTitle('🛡️ Teste de Segurança de Conteúdo')
        .addFields(
          {
            name: '🎯 Resultado',
            value: result.is_safe ? '✅ Conteúdo seguro' : '❌ Violações detectadas',
            inline: true,
          },
          {
            name: '💡 Recomendação',
            value:
              this.getRecommendationEmoji(result.recommendation) +
              ' ' +
              result.recommendation.toUpperCase(),
            inline: true,
          }
        )

      if (result.content_policy_violations && result.content_policy_violations.length > 0) {
        embed.addFields({
          name: '⚠️ Violações Encontradas',
          value: result.content_policy_violations
            .map(
              (v: any) =>
                `• **${v.policy}:** ${v.violation_type} (${v.severity}) - Score: ${Math.round(v.score * 100)}%`
            )
            .join('\n'),
          inline: false,
        })
      }

      embed
        .setFooter({
          text: `Teste realizado por ${ctx.author.username} • Content Safety`,
          iconURL: ctx.author.avatarURL() || undefined,
        })
        .setTimestamp()

      await ctx.editMessage({ embeds: [embed] })
    } catch (error) {
      console.error('Safety test error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro no teste',
            description: 'Ocorreu um erro durante o teste de segurança.',
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

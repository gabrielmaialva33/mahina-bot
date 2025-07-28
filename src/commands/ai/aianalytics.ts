import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

export default class AIAnalytics extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aianalytics',
      description: {
        content: 'Analise dados de IA e métricas com TimescaleDB',
        examples: [
          'aianalytics user',
          'aianalytics models',
          'aianalytics sentiment 7d',
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
          description: 'Análise detalhada do seu uso de IA',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
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
            },
          ],
        },
        {
          name: 'models',
          description: 'Performance e uso dos modelos de IA',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'period',
              description: 'Período de análise',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: 'Última hora', value: '1h' },
                { name: 'Últimas 24 horas', value: '24h' },
                { name: 'Últimos 7 dias', value: '7d' },
              ],
            },
          ],
        },
        {
          name: 'sentiment',
          description: 'Análise de sentimento ao longo do tempo',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'period',
              description: 'Período de análise',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: 'Últimas 24 horas', value: '24h' },
                { name: 'Últimos 7 dias', value: '7d' },
                { name: 'Últimos 30 dias', value: '30d' },
              ],
            },
          ],
        },
        {
          name: 'search',
          description: 'Buscar conversas similares usando embeddings',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'query',
              description: 'Texto para buscar',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: 'limit',
              description: 'Número de resultados',
              type: ApplicationCommandOptionType.Integer,
              required: false,
              minValue: 1,
              maxValue: 10,
            },
          ],
        },
        {
          name: 'patterns',
          description: 'Padrões de uso e comportamento',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'export',
          description: 'Exportar dados de analytics',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'format',
              description: 'Formato de exportação',
              type: ApplicationCommandOptionType.String,
              required: false,
              choices: [
                { name: 'JSON', value: 'json' },
                { name: 'CSV', value: 'csv' },
                { name: 'Markdown', value: 'md' },
              ],
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand()
      : args[0]?.toLowerCase() || 'user'

    // Check if TimescaleDB is available
    const db = client.db
    const prisma = await db.getPrismaClient().catch(() => null)

    if (!prisma) {
      return await ctx.sendMessage({
        embeds: [
          {
            title: '❌ Banco de Dados Indisponível',
            description: 'O TimescaleDB não está configurado ou disponível.',
            color: client.config.color.red,
          },
        ],
      })
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.blue)
      .setDescription('📊 Analisando dados...')

    const msg = await ctx.sendMessage({ embeds: [loadingEmbed] })

    try {
      switch (subcommand) {
        case 'user':
          await this.userAnalytics(ctx, client, msg, prisma)
          break

        case 'models':
          await this.modelAnalytics(ctx, client, msg, prisma)
          break

        case 'sentiment':
          await this.sentimentAnalytics(ctx, client, msg, prisma)
          break

        case 'search':
          await this.semanticSearch(ctx, client, msg, prisma)
          break

        case 'patterns':
          await this.behaviorPatterns(ctx, client, msg, prisma)
          break

        case 'export':
          await this.exportData(ctx, client, msg, prisma)
          break

        default:
          await this.userAnalytics(ctx, client, msg, prisma)
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro na Análise')
        .setColor(client.config.color.red)
        .setDescription((error as Error).message)

      await ctx.editMessage({ embeds: [errorEmbed] })
    }
  }

  private async userAnalytics(
    ctx: Context,
    client: MahinaBot,
    msg: any,
    prisma: any
  ): Promise<void> {
    const period = ctx.isInteraction ? (ctx.options.get('period')?.value as string) || '7d' : '7d'

    const userId = ctx.author.id
    const guildId = ctx.guild?.id || 'DM'

    // Query user interaction data
    const timeFilter = this.getTimeFilter(period)

    const interactions = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
        AVG(response_time_ms) as avg_response_time,
        SUM(tokens_used) as total_tokens,
        COUNT(DISTINCT model_used) as models_used,
        MAX(created_at) as last_interaction
      FROM ai_interactions
      WHERE user_id = ${userId}
        ${timeFilter ? prisma.$queryRaw`AND created_at >= ${timeFilter}` : prisma.$queryRaw``}
    `

    const topModels = await prisma.$queryRaw`
      SELECT 
        model_used,
        COUNT(*) as usage_count,
        AVG(response_time_ms) as avg_response_time
      FROM ai_interactions
      WHERE user_id = ${userId}
        ${timeFilter ? prisma.$queryRaw`AND created_at >= ${timeFilter}` : prisma.$queryRaw``}
      GROUP BY model_used
      ORDER BY usage_count DESC
      LIMIT 5
    `

    const sentimentData = await prisma.$queryRaw`
      SELECT 
        metadata->>'sentiment' as sentiment,
        COUNT(*) as count
      FROM ai_interactions
      WHERE user_id = ${userId}
        AND metadata ? 'sentiment'
        ${timeFilter ? prisma.$queryRaw`AND created_at >= ${timeFilter}` : prisma.$queryRaw``}
      GROUP BY metadata->>'sentiment'
    `

    const stats = interactions[0] || {}

    const embed = new EmbedBuilder()
      .setTitle(`📊 Suas Estatísticas de IA (${this.getPeriodLabel(period)})`)
      .setColor(client.config.color.main)
      .setThumbnail(ctx.author.displayAvatarURL())
      .addFields({
        name: '📈 Visão Geral',
        value: [
          `Total de Interações: **${stats.total_interactions || 0}**`,
          `Dias Ativos: **${stats.active_days || 0}**`,
          `Tempo Médio de Resposta: **${Math.round(stats.avg_response_time || 0)}ms**`,
          `Tokens Usados: **${(stats.total_tokens || 0).toLocaleString()}**`,
          `Modelos Diferentes: **${stats.models_used || 0}**`,
        ].join('\n'),
        inline: false,
      })

    if (topModels.length > 0) {
      const modelsText = topModels
        .map(
          (m: any) =>
            `• ${m.model_used}: **${m.usage_count}** usos (${Math.round(m.avg_response_time)}ms)`
        )
        .join('\n')

      embed.addFields({
        name: '🤖 Modelos Mais Usados',
        value: modelsText || 'Nenhum modelo usado ainda',
        inline: false,
      })
    }

    if (sentimentData.length > 0) {
      const total = sentimentData.reduce((acc: number, s: any) => acc + Number(s.count), 0)
      const sentimentText = sentimentData
        .map((s: any) => {
          const percentage = Math.round((Number(s.count) / total) * 100)
          const emoji = this.getSentimentEmoji(s.sentiment)
          return `${emoji} ${s.sentiment}: **${percentage}%** (${s.count})`
        })
        .join('\n')

      embed.addFields({
        name: '💭 Análise de Sentimento',
        value: sentimentText,
        inline: false,
      })
    }

    // Add insights
    const insights = await this.generateInsights(stats, topModels, sentimentData)
    if (insights.length > 0) {
      embed.addFields({
        name: '💡 Insights',
        value: insights.join('\n'),
        inline: false,
      })
    }

    embed.setFooter({
      text: `Última interação: ${stats.last_interaction ? new Date(stats.last_interaction).toLocaleString('pt-BR') : 'Nunca'}`,
    })

    // Add interactive menu
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('analytics_menu')
        .setPlaceholder('Ver mais análises...')
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Análise por Hora')
            .setDescription('Ver padrões de uso por hora do dia')
            .setValue('hourly')
            .setEmoji('⏰'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Tópicos Favoritos')
            .setDescription('Seus tópicos mais discutidos')
            .setValue('topics')
            .setEmoji('🏷️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Comparar Modelos')
            .setDescription('Comparação detalhada entre modelos')
            .setValue('compare')
            .setEmoji('⚖️'),
        ])
    )

    await ctx.editMessage({ embeds: [embed], components: [menu] })
  }

  private async modelAnalytics(
    ctx: Context,
    client: MahinaBot,
    msg: any,
    prisma: any
  ): Promise<void> {
    const period = ctx.isInteraction ? (ctx.options.get('period')?.value as string) || '24h' : '24h'

    const timeFilter = this.getTimeFilter(period)

    // Query model performance metrics
    const modelStats = await prisma.$queryRaw`
      SELECT 
        model_name,
        SUM(request_count) as total_requests,
        SUM(total_tokens) as total_tokens,
        AVG(avg_response_time_ms) as avg_response_time,
        SUM(error_count) as total_errors,
        AVG(success_rate) as avg_success_rate
      FROM ai_model_metrics
      WHERE created_at >= ${timeFilter}
      GROUP BY model_name
      ORDER BY total_requests DESC
    `

    // Get hourly aggregates if available
    const hourlyStats = await prisma.$queryRaw`
      SELECT 
        hour,
        model_name,
        request_count,
        avg_response_time,
        total_tokens
      FROM ai_metrics_hourly
      WHERE hour >= ${timeFilter}
      ORDER BY hour DESC, request_count DESC
      LIMIT 50
    `

    const embed = new EmbedBuilder()
      .setTitle(`🤖 Performance dos Modelos (${this.getPeriodLabel(period)})`)
      .setColor(client.config.color.blue)
      .setDescription('Métricas detalhadas de performance dos modelos de IA')
      .setTimestamp()

    if (modelStats.length > 0) {
      for (const model of modelStats.slice(0, 5)) {
        const successRate = Math.round((model.avg_success_rate || 0) * 100)
        const errorRate =
          model.total_requests > 0
            ? Math.round((model.total_errors / model.total_requests) * 100)
            : 0

        embed.addFields({
          name: `📊 ${this.formatModelName(model.model_name)}`,
          value: [
            `Requisições: **${model.total_requests}**`,
            `Tokens: **${Number(model.total_tokens).toLocaleString()}**`,
            `Tempo médio: **${Math.round(model.avg_response_time)}ms**`,
            `Taxa de sucesso: **${successRate}%**`,
            `Erros: **${model.total_errors}** (${errorRate}%)`,
          ].join(' | '),
          inline: false,
        })
      }
    } else {
      embed.addFields({
        name: 'Sem dados',
        value: 'Nenhuma métrica disponível para o período selecionado.',
      })
    }

    // Add cost estimation
    const costEstimate = this.estimateCosts(modelStats)
    if (costEstimate > 0) {
      embed.addFields({
        name: '💰 Custo Estimado',
        value: `$${costEstimate.toFixed(4)} no período`,
        inline: true,
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async sentimentAnalytics(
    ctx: Context,
    client: MahinaBot,
    msg: any,
    prisma: any
  ): Promise<void> {
    const period = ctx.isInteraction ? (ctx.options.get('period')?.value as string) || '7d' : '7d'

    const userId = ctx.author.id
    const interval = period === '24h' ? '1 hour' : period === '7d' ? '1 day' : '1 week'

    // Use the function we created in the SQL
    const sentimentOverTime = await prisma.$queryRaw`
      SELECT * FROM analyze_user_sentiment_over_time(
        ${userId},
        ${interval}::interval
      )
      ORDER BY time_bucket DESC
      LIMIT 20
    `

    const embed = new EmbedBuilder()
      .setTitle(`💭 Análise de Sentimento (${this.getPeriodLabel(period)})`)
      .setColor(client.config.color.violet)
      .setDescription('Como suas interações com a IA têm sido ao longo do tempo')

    if (sentimentOverTime.length > 0) {
      // Calculate overall sentiment
      const totalPositive = sentimentOverTime.reduce(
        (acc: number, s: any) => acc + Number(s.positive_count),
        0
      )
      const totalNegative = sentimentOverTime.reduce(
        (acc: number, s: any) => acc + Number(s.negative_count),
        0
      )
      const totalNeutral = sentimentOverTime.reduce(
        (acc: number, s: any) => acc + Number(s.neutral_count),
        0
      )
      const total = totalPositive + totalNegative + totalNeutral

      embed.addFields({
        name: '📊 Resumo Geral',
        value: [
          `😊 Positivo: **${Math.round((totalPositive / total) * 100)}%** (${totalPositive})`,
          `😐 Neutro: **${Math.round((totalNeutral / total) * 100)}%** (${totalNeutral})`,
          `😔 Negativo: **${Math.round((totalNegative / total) * 100)}%** (${totalNegative})`,
        ].join('\n'),
        inline: false,
      })

      // Show recent trend
      const recentData = sentimentOverTime.slice(0, 5)
      const trendText = recentData
        .map((s: any) => {
          const date = new Date(s.time_bucket).toLocaleDateString('pt-BR')
          const avgSentiment = Number(s.avg_sentiment || 0).toFixed(2)
          const emoji = avgSentiment > 0.3 ? '😊' : avgSentiment < -0.3 ? '😔' : '😐'
          return `${date}: ${emoji} (${avgSentiment})`
        })
        .join('\n')

      embed.addFields({
        name: '📈 Tendência Recente',
        value: trendText || 'Sem dados recentes',
        inline: false,
      })

      // Generate sentiment insights
      const sentimentInsights = this.generateSentimentInsights(sentimentOverTime)
      if (sentimentInsights.length > 0) {
        embed.addFields({
          name: '💡 Observações',
          value: sentimentInsights.join('\n'),
          inline: false,
        })
      }
    } else {
      embed.addFields({
        name: 'Sem dados',
        value: 'Nenhuma análise de sentimento disponível para o período.',
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async semanticSearch(
    ctx: Context,
    client: MahinaBot,
    msg: any,
    prisma: any
  ): Promise<void> {
    const query = ctx.isInteraction
      ? (ctx.options.get('query')?.value as string)
      : ctx.args.slice(1).join(' ')
    const limit = ctx.isInteraction ? (ctx.options.get('limit')?.value as number) || 5 : 5

    if (!query) {
      return await ctx.editMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça um texto para buscar!',
            color: client.config.color.red,
          },
        ],
      })
    }

    // Use the semantic search function
    const results = await prisma.$queryRaw`
      SELECT * FROM search_ai_interactions(
        ${query},
        ${ctx.author.id},
        NOW() - INTERVAL '90 days',
        NOW(),
        ${limit}
      )
    `

    const embed = new EmbedBuilder()
      .setTitle('🔍 Busca Semântica')
      .setColor(client.config.color.green)
      .setDescription(`Resultados similares a: "${query}"`)

    if (results.length > 0) {
      for (const [index, result] of results.entries()) {
        const similarity = (Number(result.similarity) * 100).toFixed(1)
        const date = new Date(result.created_at).toLocaleDateString('pt-BR')

        embed.addFields({
          name: `#${index + 1} - Similaridade: ${similarity}% (${date})`,
          value: [
            `**Você:** ${result.message.substring(0, 200)}${result.message.length > 200 ? '...' : ''}`,
            `**IA:** ${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}`,
          ].join('\n'),
          inline: false,
        })
      }
    } else {
      embed.addFields({
        name: 'Sem resultados',
        value: 'Nenhuma conversa similar encontrada.',
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async behaviorPatterns(
    ctx: Context,
    client: MahinaBot,
    msg: any,
    prisma: any
  ): Promise<void> {
    const userId = ctx.author.id

    // Query behavior patterns
    const patterns = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        COUNT(*) as interaction_count,
        AVG(response_time_ms) as avg_response_time
      FROM ai_interactions
      WHERE user_id = ${userId}
      GROUP BY hour_of_day
      ORDER BY hour_of_day
    `

    const topTopics = await prisma.$queryRaw`
      SELECT 
        jsonb_array_elements_text(metadata->'topics') as topic,
        COUNT(*) as count
      FROM ai_interactions
      WHERE user_id = ${userId}
        AND metadata ? 'topics'
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `

    const embed = new EmbedBuilder()
      .setTitle('🔍 Seus Padrões de Uso')
      .setColor(client.config.color.main)
      .setDescription('Análise comportamental das suas interações com IA')

    // Hour of day analysis
    if (patterns.length > 0) {
      const peakHour = patterns.reduce((max: any, p: any) =>
        Number(p.interaction_count) > Number(max.interaction_count) ? p : max
      )

      const hourlyText = [
        `🏆 Horário de pico: **${peakHour.hour_of_day}h** (${peakHour.interaction_count} interações)`,
        `⚡ Resposta mais rápida: **${Math.round(Math.min(...patterns.map((p: any) => Number(p.avg_response_time))))}ms**`,
      ].join('\n')

      embed.addFields({
        name: '⏰ Padrões por Hora',
        value: hourlyText,
        inline: false,
      })
    }

    // Top topics
    if (topTopics.length > 0) {
      const topicsText = topTopics
        .slice(0, 5)
        .map((t: any, i: number) => `${i + 1}. **${t.topic}** (${t.count} vezes)`)
        .join('\n')

      embed.addFields({
        name: '🏷️ Tópicos Favoritos',
        value: topicsText,
        inline: false,
      })
    }

    // Add recommendations
    const recommendations = this.generateRecommendations(patterns, topTopics)
    if (recommendations.length > 0) {
      embed.addFields({
        name: '💡 Recomendações',
        value: recommendations.join('\n'),
        inline: false,
      })
    }

    await ctx.editMessage({ embeds: [embed] })
  }

  private async exportData(ctx: Context, client: MahinaBot, msg: any, prisma: any): Promise<void> {
    const format = ctx.isInteraction
      ? (ctx.options.get('format')?.value as string) || 'json'
      : 'json'

    // This would require implementation
    const embed = new EmbedBuilder()
      .setTitle('📤 Exportar Dados')
      .setColor(client.config.color.yellow)
      .setDescription('Funcionalidade em desenvolvimento!')
      .addFields({
        name: 'Em breve',
        value: 'A exportação de dados estará disponível em uma próxima atualização.',
      })

    await ctx.editMessage({ embeds: [embed] })
  }

  // Helper methods
  private getTimeFilter(period: string): Date | null {
    const now = new Date()
    switch (period) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000)
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      default:
        return null
    }
  }

  private getPeriodLabel(period: string): string {
    const labels: Record<string, string> = {
      '1h': 'Última Hora',
      '24h': 'Últimas 24 Horas',
      '7d': 'Últimos 7 Dias',
      '30d': 'Últimos 30 Dias',
      'all': 'Todos os Tempos',
    }
    return labels[period] || period
  }

  private getSentimentEmoji(sentiment: string): string {
    const emojis: Record<string, string> = {
      positive: '😊',
      neutral: '😐',
      negative: '😔',
    }
    return emojis[sentiment] || '🤔'
  }

  private formatModelName(modelId: string): string {
    // Map model IDs to friendly names
    const modelNames: Record<string, string> = {
      'meta/llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick',
      'deepseek-ai/deepseek-r1': 'DeepSeek R1',
      'nvidia/llama-3.1-nemotron-ultra-253b-v1': 'Nemotron Ultra',
    }
    return modelNames[modelId] || modelId
  }

  private estimateCosts(modelStats: any[]): number {
    // Rough cost estimation based on tokens
    let totalCost = 0
    for (const model of modelStats) {
      const tokensInMillions = Number(model.total_tokens) / 1_000_000
      const costPerMillion = this.getModelCost(model.model_name)
      totalCost += tokensInMillions * costPerMillion
    }
    return totalCost
  }

  private getModelCost(modelName: string): number {
    // Rough cost estimates per million tokens
    const costs: Record<string, number> = {
      'meta/llama-4-maverick-17b-128e-instruct': 0.5,
      'nvidia/llama-3.1-nemotron-ultra-253b-v1': 2.0,
      'deepseek-ai/deepseek-r1': 0.8,
    }
    return costs[modelName] || 1.0
  }

  private async generateInsights(
    stats: any,
    topModels: any[],
    sentimentData: any[]
  ): Promise<string[]> {
    const insights = []

    // Usage insights
    if (stats.total_interactions > 100) {
      insights.push('🌟 Você é um usuário avançado de IA!')
    }

    if (stats.avg_response_time < 1000) {
      insights.push('⚡ Suas interações têm respostas super rápidas!')
    }

    // Model insights
    if (topModels.length > 3) {
      insights.push('🔄 Você gosta de experimentar diferentes modelos!')
    }

    // Sentiment insights
    const positiveCount = sentimentData.find((s: any) => s.sentiment === 'positive')?.count || 0
    const totalSentiment = sentimentData.reduce((acc: number, s: any) => acc + Number(s.count), 0)
    if (totalSentiment > 0 && positiveCount / totalSentiment > 0.7) {
      insights.push('😊 Suas conversas são majoritariamente positivas!')
    }

    return insights
  }

  private generateSentimentInsights(data: any[]): string[] {
    const insights = []

    // Trend analysis
    if (data.length >= 3) {
      const recent = data.slice(0, 3)
      const avgRecent =
        recent.reduce((acc: number, s: any) => acc + Number(s.avg_sentiment || 0), 0) / 3

      if (avgRecent > 0.5) {
        insights.push('📈 Tendência muito positiva recentemente!')
      } else if (avgRecent < -0.5) {
        insights.push('📉 Suas interações têm sido mais negativas. Posso ajudar?')
      }
    }

    return insights
  }

  private generateRecommendations(patterns: any[], topics: any[]): string[] {
    const recommendations = []

    // Time-based recommendations
    const nightUsage = patterns.filter((p: any) => p.hour_of_day >= 22 || p.hour_of_day <= 5)
    if (nightUsage.length > 0) {
      recommendations.push('🌙 Você usa bastante a IA durante a noite!')
    }

    // Topic-based recommendations
    if (topics.some((t: any) => t.topic.toLowerCase().includes('code'))) {
      recommendations.push('💻 Experimente o modelo Qwen Coder para programação!')
    }

    if (topics.some((t: any) => t.topic.toLowerCase().includes('music'))) {
      recommendations.push('🎵 Use o modo DJ da Mahina AI para sugestões musicais!')
    }

    return recommendations
  }
}

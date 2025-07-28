import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } from 'discord.js'

export default class SearchCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'search',
      description: {
        content: 'Busca por comandos e informações usando IA semântica',
        examples: ['search como tocar música', 'search pausar som', 'search fila de reprodução'],
        usage: 'search <pergunta>',
      },
      category: 'ai',
      aliases: ['buscar', 'find', 'help-ai'],
      cooldown: 5,
      args: true,
      vote: false,
      player: undefined,
      permissions: {
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'pergunta',
          description: 'O que você está procurando? Ex: como tocar música, pausar som, etc.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'categoria',
          description: 'Filtrar por categoria específica',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🎵 Música', value: 'music' },
            { name: '🎚️ Filtros', value: 'filters' },
            { name: '📋 Playlist', value: 'playlist' },
            { name: '⚙️ Configuração', value: 'config' },
            { name: 'ℹ️ Informações', value: 'info' },
          ],
        },
        {
          name: 'precisao',
          description: 'Nível de precisão da busca (padrão: 0.5)',
          type: ApplicationCommandOptionType.Number,
          required: false,
          min_value: 0.1,
          max_value: 1.0,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    // Parse arguments
    let query: string
    let category: string | undefined
    let threshold: number

    if (ctx.isInteraction) {
      query = ctx.options.get('pergunta')?.value as string
      category = (ctx.options.get('categoria')?.value as string) || undefined
      threshold = (ctx.options.get('precisao')?.value as number) || 0.5
    } else {
      query = args.join(' ')
      category = undefined
      threshold = 0.5
    }

    if (!query) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Por favor, forneça uma pergunta ou termo para buscar!',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Get embedding service
    const embeddingService = client.services.nvidiaEmbedding
    if (!embeddingService) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Serviço de busca semântica não está disponível.',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    if (!embeddingService.isAvailable()) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Serviço de busca não está configurado. Configure NVIDIA_API_KEY.',
            color: client.config.color.red,
          },
        ],
        flags: MessageFlags.Ephemeral,
      })
    }

    // Show loading message
    const loadingEmbed = new EmbedBuilder()
      .setColor(client.config.color.main)
      .setDescription('🔍 Buscando informações relevantes...')
      .addFields(
        { name: '🔎 Consulta', value: query, inline: false },
        { name: '📊 Precisão', value: `${Math.round(threshold * 100)}%`, inline: true }
      )
      .setFooter({ text: 'NVIDIA Embeddings • Busca Semântica' })

    if (category) {
      loadingEmbed.addFields({
        name: '📂 Categoria',
        value: this.getCategoryName(category),
        inline: true,
      })
    }

    await ctx.sendDeferMessage({ embeds: [loadingEmbed] })

    try {
      // Build knowledge base
      let knowledgeBase = embeddingService.buildMusicKnowledgeBase()

      // Filter by category if specified
      if (category) {
        knowledgeBase = knowledgeBase.filter(
          (item: any) => item.metadata?.category === category || item.metadata?.type === category
        )
      }

      // Search for similar content
      const results = await embeddingService.searchSimilar(query, knowledgeBase, threshold, 8)

      if (results.length === 0) {
        return await ctx.editMessage({
          embeds: [
            {
              title: '🔍 Nenhum resultado encontrado',
              description: `Não encontrei informações relevantes para: **${query}**`,
              fields: [
                {
                  name: '💡 Dicas',
                  value: [
                    '• Tente reformular sua pergunta',
                    '• Use palavras-chave mais específicas',
                    '• Diminua o nível de precisão',
                    '• Remova o filtro de categoria',
                  ].join('\n'),
                  inline: false,
                },
              ],
              color: client.config.color.yellow,
            },
          ],
        })
      }

      // Create results embed
      const resultsEmbed = new EmbedBuilder()
        .setColor(client.config.color.green)
        .setTitle('🔍 Resultados da Busca')
        .setDescription(`Encontrei **${results.length}** resultado(s) para: **${query}**`)
        .setFooter({
          text: `Solicitado por ${ctx.author!.username} • Busca com IA`,
          iconURL: ctx.author!.avatarURL() || undefined,
        })
        .setTimestamp()

      // Add results as fields
      results.forEach((result: any, index: number) => {
        const similarity = Math.round(result.similarity * 100)
        const categoryIcon = this.getCategoryIcon(
          result.metadata?.category || result.metadata?.type
        )

        resultsEmbed.addFields({
          name: `${categoryIcon} Resultado ${index + 1} (${similarity}% de similaridade)`,
          value: result.content,
          inline: false,
        })
      })

      // Add statistics
      const stats = embeddingService.getCacheStats()
      resultsEmbed.addFields({
        name: '📊 Estatísticas',
        value: `Cache: ${stats.size} embeddings armazenados`,
        inline: true,
      })

      await ctx.editMessage({
        embeds: [resultsEmbed],
      })
    } catch (error) {
      console.error('Search Error:', error)
      await ctx.editMessage({
        embeds: [
          {
            title: '❌ Erro na busca',
            description: 'Ocorreu um erro durante a busca. Tente novamente mais tarde.',
            fields: [
              {
                name: 'Detalhes do erro',
                value: (error as Error).message || 'Erro desconhecido',
                inline: false,
              },
            ],
            color: client.config.color.red,
          },
        ],
      })
    }
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      music: '🎵 Música',
      filters: '🎚️ Filtros',
      playlist: '📋 Playlist',
      config: '⚙️ Configuração',
      info: 'ℹ️ Informações',
    }
    return names[category] || category
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      music: '🎵',
      filters: '🎚️',
      playlist: '📋',
      config: '⚙️',
      info: 'ℹ️',
      command: '⌨️',
      general: '📚',
      platform: '🌐',
    }
    return icons[category] || '📄'
  }
}

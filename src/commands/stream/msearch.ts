import { BaseClient, Command, Context } from '#common/index'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import { SearchResponse } from '#src/plugins/animezey.plugin'

export default class MSearch extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'msearch',
      description: {
        content: 'Pesquisa por filmes ou animes',
        examples: ['msearch', 'msearch <nome do anime>'],
        usage: 'msearch',
      },
      category: 'stream',
      aliases: ['ms'],
      cooldown: 3,
      args: true,
      player: {
        voice: true,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'search',
          description: 'Pesquisa por filmes ou animes',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.channel) return
    if (!ctx.guild) return
    if (!ctx.author) return

    const search = args.join(' ').trim()

    const cache = {
      pages: [] as Array<{ files: any[] }>,
      nextPageTokens: [] as string[],
    }

    const fetchPage = async (pageIndex: number) => {
      if (cache.pages[pageIndex]) {
        return cache.pages[pageIndex]
      }

      const nextPageToken = cache.nextPageTokens[pageIndex - 1] || null
      const response: SearchResponse | null = await client.animezey.searchAnime(
        search,
        nextPageToken
      )
      if (!response) return null

      const { data } = response
      const filteredData = {
        ...data,
        files: data.files.filter((file) => file.mimeType === 'video/x-matroska'),
      }
      cache.pages[pageIndex] = filteredData
      cache.nextPageTokens[pageIndex] = data.nextPageToken
      return filteredData
    }

    // Function to create embed for a page
    const createEmbed = (
      pageData: any[],
      pageIndex: number,
      itemPageIndex: number,
      totalItems: number
    ) => {
      const itemsPerPage = 5
      const startIndex = itemPageIndex * itemsPerPage
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
      const paginatedData = pageData.slice(startIndex, endIndex)

      const embed = new EmbedBuilder()
        .setTitle(`Resultados da Pesquisa: ${search}`)
        .setDescription(
          paginatedData.map((anime) => `**${anime.name}**\n[Link](${anime.link})`).join('\n\n')
        )
        .setFooter({
          text: `Página ${pageIndex + 1} | Itens ${startIndex + 1}-${endIndex} de ${totalItems}`,
        })
      return embed
    }

    // Function to handle pagination
    const handlePage = async (pageIndex: number, itemPageIndex: number, interaction: any) => {
      const pageData = await fetchPage(pageIndex)
      if (!pageData)
        return interaction.update({ content: 'Erro ao buscar informações', components: [] })

      const totalItems = pageData.files.length
      const embed = createEmbed(pageData.files, pageIndex, itemPageIndex, totalItems)

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('prevPage')
          .setLabel('Página Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('nextPage')
          .setLabel('Próxima Página')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!cache.nextPageTokens[pageIndex]),
        new ButtonBuilder()
          .setCustomId('prevItemPage')
          .setLabel('Itens Anteriores')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(itemPageIndex === 0),
        new ButtonBuilder()
          .setCustomId('nextItemPage')
          .setLabel('Próximos Itens')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled((itemPageIndex + 1) * 5 >= totalItems)
      )

      await interaction.update({ embeds: [embed], components: [row] })
    }

    const initialPageIndex = 0
    const initialItemPageIndex = 0
    const initialPageData = await fetchPage(initialPageIndex)
    if (!initialPageData) return ctx.sendMessage('Erro ao buscar informações')

    const totalItems = initialPageData.files.length
    const initialEmbed = createEmbed(
      initialPageData.files,
      initialPageIndex,
      initialItemPageIndex,
      totalItems
    )

    const initialRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('prevPage')
        .setLabel('Página Anterior')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('nextPage')
        .setLabel('Próxima Página')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!cache.nextPageTokens[initialPageIndex]),
      new ButtonBuilder()
        .setCustomId('prevItemPage')
        .setLabel('Itens Anteriores')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('nextItemPage')
        .setLabel('Próximos Itens')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalItems <= 5)
    )

    const message = await ctx.sendMessage({ embeds: [initialEmbed], components: [initialRow] })
    if (!message) return

    const filter = (i: any) => i.user.id === ctx.author!.id
    const collector = message.createMessageComponentCollector({ filter, time: 60000 })

    let currentPageIndex = initialPageIndex
    let currentItemPageIndex = initialItemPageIndex

    collector.on('collect', async (interaction: any) => {
      if (interaction.customId === 'prevPage') {
        currentPageIndex--
        currentItemPageIndex = 0
      } else if (interaction.customId === 'nextPage') {
        currentPageIndex++
        currentItemPageIndex = 0
      } else if (interaction.customId === 'prevItemPage') {
        currentItemPageIndex--
      } else if (interaction.customId === 'nextItemPage') {
        currentItemPageIndex++
      }

      await handlePage(currentPageIndex, currentItemPageIndex, interaction)
    })

    collector.on('end', async () => {
      await message.edit({ components: [] })
    })
  }
}

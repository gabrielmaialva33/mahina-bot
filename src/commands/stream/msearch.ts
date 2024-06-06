import { BaseClient, Command, Context } from '#common/index'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import { SearchResponse } from '#src/plugins/animezey.plugin'
import moment from 'moment'

import path from 'node:path'

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

    const numbersEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']

    try {
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
        const paginatedData = pageData.slice(startIndex, startIndex + itemsPerPage)

        const embed = new EmbedBuilder()
          .setTitle(`**__Resultados da Pesquisa__**: ${search}`)
          .setDescription(
            paginatedData
              .map(
                (anime, index) => `
              **Número**: ${numbersEmojis[index]}
              **Nome**: ${anime.name}
              **Tamanho**: ${(Number.parseInt(anime.size) / 1024 / 1024 / 1024).toFixed(2)} GB
              **Data de Modificação**: ${moment(anime.modifiedTime).format('DD/MM/YYYY HH:mm:ss')}
              **Link**: [Download](${client.animezey.BASE_URL + anime.link})
              `
              )
              .join('\n\n')
          )
          .setFooter({
            text: `Página ${pageIndex + 1} | Itens ${startIndex + 1}-${startIndex + paginatedData.length} de ${totalItems}`,
            iconURL: ctx.author!.avatarURL() || undefined,
          })
          .setColor(client.color.violet)

        return embed
      }

      // Function to handle pagination with download buttons
      const handlePage = async (pageIndex: number, itemPageIndex: number, interaction: any) => {
        const pageData = await fetchPage(pageIndex)
        if (!pageData)
          return interaction.update({ content: 'Erro ao buscar informações', components: [] })

        const totalItems = pageData.files.length
        const embed = createEmbed(pageData.files, pageIndex, itemPageIndex, totalItems)

        const itemsPerPage = 5
        const startIndex = itemPageIndex * itemsPerPage

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
            .setDisabled((itemPageIndex + 1) * itemsPerPage >= totalItems)
        )

        const downloadRow = new ActionRowBuilder<ButtonBuilder>()
        for (let i = 0; i < Math.min(itemsPerPage, totalItems - startIndex); i++) {
          downloadRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`download_${i + 1}`)
              .setLabel(`Assistir ${numbersEmojis[i]}`)
              .setStyle(ButtonStyle.Success)
          )
        }

        await interaction.update({ embeds: [embed], components: [row, downloadRow] })
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

      const initialDownloadRow = new ActionRowBuilder<ButtonBuilder>()
      for (let i = 0; i < Math.min(5, totalItems); i++) {
        initialDownloadRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`download_${i + 1}`)
            .setLabel(`Assistir ${numbersEmojis[i]}`)
            .setStyle(ButtonStyle.Success)
        )
      }

      const message = await ctx.sendMessage({
        embeds: [initialEmbed],
        components: [initialRow, initialDownloadRow],
      })
      if (!message) return

      const filter = (i: any) => i.user.id === ctx.author!.id
      const collector = message.createMessageComponentCollector({ filter, time: 60000 })

      let currentPageIndex = initialPageIndex
      let currentItemPageIndex = initialItemPageIndex

      collector.on('collect', async (interaction: any) => {
        if (interaction.customId.startsWith('download_')) {
          const downloadIndex = Number.parseInt(interaction.customId.split('_')[1], 10) - 1
          const startIndex = currentItemPageIndex * 5
          const file = cache.pages[currentPageIndex].files[startIndex + downloadIndex]

          await interaction.reply(
            `Iniciando download: ${file.name} o vídeo será reproduzido em 30 segundos`
          )

          this.client.animezey.download(file.name, file.link)

          await new Promise((resolve) => setTimeout(resolve, 30000))

          const sanitizedFileName = file.name.replace(/[\/\?<>\\:\*\|":]/g, '_')
          const filePath = path.join(process.cwd(), 'movies', sanitizedFileName)

          await this.client.selfClient.moviePlay(
            ctx.member,
            ctx.guild!.id,
            filePath,
            sanitizedFileName
          )
        } else {
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
        }
      })

      collector.on('end', async () => {
        await message.edit({ components: [] })
      })
    } catch (error) {
      console.log(`error in msearch command: ${error}`)
    }
  }
}

import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CollectedInteraction,
  EmbedBuilder,
  ModalMessageModalSubmitInteraction,
} from 'discord.js'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

import moment from 'moment'
import path from 'node:path'

import { FileResponse, SearchDataResponse, SearchResponse } from '#src/platforms/animezey'

interface Cache {
  pages: Array<SearchDataResponse>
  nextPageTokens: string[]
}

export default class MSearch extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'msearch',
      description: {
        content: 'cmd.msearch.description',
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
        djPerm: null,
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
          description: 'cmd.msearch.options.search',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.channel || !ctx.guild || !ctx.member || !ctx.author) return

    const search = args.join(' ').trim()

    const cache: Cache = { pages: [], nextPageTokens: [] }

    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']

    let contentType: 'anime' | 'movie' = 'anime'

    const fetchPage = async (pageIndex: number) => {
      if (cache.pages[pageIndex]) return cache.pages[pageIndex]

      const nextPageToken = cache.nextPageTokens[pageIndex - 1] || null
      let response: SearchResponse | null = null

      if (contentType === 'anime') {
        response = await client.animezey.searchAnime(search, nextPageToken)
      } else if (contentType === 'movie') {
        response = await client.animezey.searchMovie(search, nextPageToken)
      }

      if (!response) return null

      const { data } = response
      const filteredData = {
        ...data,
        files: data.files.filter(
          (file) => file.mimeType === 'video/x-matroska' || file.mimeType === 'video/mp4'
        ),
      }

      cache.pages[pageIndex] = filteredData
      cache.nextPageTokens[pageIndex] = data.nextPageToken

      return filteredData
    }

    // Function to create embed for a page
    const createEmbed = (
      pageData: Array<FileResponse>,
      pageIndex: number,
      itemPageIndex: number,
      totalItems: number
    ) => {
      const itemsPerPage = 5
      const startIndex = itemPageIndex * itemsPerPage
      const paginatedData = pageData.slice(startIndex, startIndex + itemsPerPage)

      const embed = new EmbedBuilder().setTitle(`**__Resultados da Pesquisa__**: ${search}`)
      if (paginatedData.length === 0)
        return embed.setDescription('Nenhum resultado encontrado').setColor(client.color.red)

      embed
        .setDescription(
          paginatedData
            // .map(
            //   (video, index) => `
            //   **Número**: ${emojiNumbers[index]}
            //   **Nome**: ${video.name}
            //   **Tamanho**: ${(Number.parseInt(video.size) / 1024 / 1024 / 1024).toFixed(2)} GB
            //   **Data de Modificação**: ${moment(video.modifiedTime).format('DD/MM/YYYY HH:mm:ss')}
            //   **Link**: [Download](${client.animezey.BASE_URL + video.link})
            //   `
            // )
            .map(
              (video, index) => `
              **Número**: ${emojiNumbers[index]}
              **Nome**: ${video.name}
              **Tamanho**: ${(Number.parseInt(video.size) / 1024 / 1024 / 1024).toFixed(2)} GB
              **Link**: [Download](${client.animezey.BASE_URL + video.link})
              `
            )
            .join('\n')
        )
        .setFooter({
          text: `Página ${pageIndex + 1} | Itens ${startIndex + 1}-${startIndex + paginatedData.length} de ${totalItems}`,
          iconURL: ctx.author!.avatarURL() || undefined,
        })
        .setColor(client.color.violet)

      return embed
    }

    // Function to handle pagination with download buttons
    const handlePage = async (
      pageIndex: number,
      itemPageIndex: number,
      interaction: ModalMessageModalSubmitInteraction
    ) => {
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
            .setLabel(`Assistir ${emojiNumbers[i]}`)
            .setStyle(ButtonStyle.Success)
        )
      }

      await interaction.update({ content: '', embeds: [embed], components: [row, downloadRow] })
    }

    // Perguntar ao usuário que tipo de conteúdo ele quer
    const contentSelectionEmbed = new EmbedBuilder()
      .setTitle('Escolha o tipo de conteúdo')
      .setDescription('Por favor, escolha o tipo de conteúdo que deseja buscar.')
      .setColor(client.color.blue)

    const contentSelectionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('search_anime')
        .setLabel('Anime')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('search_movie')
        .setLabel('Filme')
        .setStyle(ButtonStyle.Primary)
    )

    const contentSelectionMessage = await ctx.sendMessage({
      embeds: [contentSelectionEmbed],
      components: [contentSelectionRow],
    })

    if (!contentSelectionMessage) return

    const contentFilter = (i: CollectedInteraction) => i.user.id === ctx.author!.id
    const contentCollector = contentSelectionMessage.createMessageComponentCollector({
      filter: contentFilter,
      time: 100_000,
    })

    contentCollector.on('collect', async (interaction: ModalMessageModalSubmitInteraction) => {
      const selectedContent = interaction.customId

      if (selectedContent === 'search_anime') {
        contentType = 'anime'
      } else if (selectedContent === 'search_movie') {
        contentType = 'movie'
      }

      // Continue com a busca e paginamento após a escolha do usuário
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
            .setLabel(`Assistir ${emojiNumbers[i]}`)
            .setStyle(ButtonStyle.Success)
        )
      }

      if (totalItems === 0) {
        const embed = new EmbedBuilder()
          .setTitle(`**__Resultados da Pesquisa__**: ${search}`)
          .setDescription('Nenhum resultado encontrado')
          .setColor(client.color.red)

        return interaction.update({ embeds: [embed], fetchReply: true })
      } else if (totalItems > 0) {
        const message = await interaction.update({
          embeds: [initialEmbed],
          components: [initialRow, initialDownloadRow],
          fetchReply: true,
        })

        if (!message) return

        const filter = (i: CollectedInteraction) => i.user.id === ctx.author!.id
        const collector = message.createMessageComponentCollector({
          filter,
          time: 100_000,
        })

        let currentPageIndex = initialPageIndex
        let currentItemPageIndex = initialItemPageIndex

        collector.on('collect', async (cInteraction: ModalMessageModalSubmitInteraction) => {
          if (cInteraction.customId.startsWith('download_')) {
            const downloadIndex = Number.parseInt(cInteraction.customId.split('_')[1], 10) - 1
            const startIndex = currentItemPageIndex * 5
            const file = cache.pages[currentPageIndex].files[startIndex + downloadIndex]

            const embed = new EmbedBuilder()
              .setTitle(`**__Download Iniciado__**: ${file.name}`)
              .setDescription(`O vídeo será reproduzido em 30 segundos`)
              .setColor(client.color.yellow)

            await cInteraction.reply({ embeds: [embed] })

            this.client.animezey.download(file.name, file.link)

            await new Promise((resolve) => setTimeout(resolve, 30000))

            const sanitizedFileName = file.name.replace(/[\/\?<>\\:\*\|":]/g, '_')

            const filePath = path.join(process.cwd(), 'downloads', sanitizedFileName)
            await client.selfbot.play(ctx.guild.id, ctx.member, filePath, sanitizedFileName)

            embed.setAuthor({ name: 'Live Stream', iconURL: this.client.config.links.live })
            embed.setTitle(`${file.name}`)
            embed.setDescription(`O vídeo está sendo reproduzido`)
            embed.setColor(client.color.red)

            embed.addFields({
              name: 'Tamanho',
              value: `${(Number.parseInt(file.size) / 1024 / 1024 / 1024).toFixed(2)} GB`,
            })
            embed.addFields({
              name: 'Data de Modificação',
              value: `${moment(file.modifiedTime).format('DD/MM/YYYY HH:mm:ss')}`,
            })
            embed.addFields({
              name: 'Link',
              value: `[Download](${client.animezey.BASE_URL + file.link})`,
            })

            await cInteraction.editReply({ embeds: [embed] })
          } else {
            if (cInteraction.customId === 'prevPage') {
              currentPageIndex--
              currentItemPageIndex = 0
            } else if (cInteraction.customId === 'nextPage') {
              currentPageIndex++
              currentItemPageIndex = 0
            } else if (cInteraction.customId === 'prevItemPage') {
              currentItemPageIndex--
            } else if (cInteraction.customId === 'nextItemPage') {
              currentItemPageIndex++
            }

            await handlePage(currentPageIndex, currentItemPageIndex, cInteraction)
          }
        })

        collector.on('end', async () => {
          const embed = new EmbedBuilder()
            .setTitle('**__Pesquisa Encerrada__**')
            .setDescription('A pesquisa foi encerrada')
            .setColor(client.color.red)

          await message.edit({ components: [], embeds: [embed] })
        })
      }
    })
  }
}

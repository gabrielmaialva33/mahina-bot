import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type CollectedInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { ensureStreamCommandReady } from '#common/stream_runtime'

import {
  type FileResponse,
  type SearchDataResponse,
  type SearchResponse,
  formatFileSize,
  formatDisplayName,
} from '#src/platforms/animezey'
import type { StreamTrack } from '#common/stream_queue'

const ITEMS_PER_PAGE = 5
const COLLECTOR_TIMEOUT = 120_000
const EMOJI_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
})

interface PageCache {
  pages: Array<SearchDataResponse>
  nextPageTokens: string[]
}

export default class MSearch extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'msearch',
      description: {
        content: 'cmd.msearch.description',
        examples: ['msearch naruto', 'msearch one piece', 'msearch interstellar'],
        usage: 'msearch <nome>',
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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    if (!ctx.channel || !ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const search = args.join(' ').trim()
    const cache: PageCache = { pages: [], nextPageTokens: [] }
    let contentType: 'anime' | 'movie' = 'anime'

    // --- Content type selection via StringSelectMenu ---
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('msearch-type')
      .setPlaceholder(ctx.locale('cmd.msearch.messages.choose_type_description'))
      .addOptions([
        { label: ctx.locale('cmd.msearch.buttons.anime'), value: 'anime', emoji: '📺' },
        { label: ctx.locale('cmd.msearch.buttons.movie'), value: 'movie', emoji: '🎬' },
      ])

    const typeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

    const typeEmbed = new EmbedBuilder()
      .setTitle(ctx.locale('cmd.msearch.messages.choose_type_title'))
      .setDescription(ctx.locale('cmd.msearch.messages.choose_type_description'))
      .setColor(client.color.blue)

    const typeMessage = await ctx.sendMessage({ embeds: [typeEmbed], components: [typeRow] })
    if (!typeMessage) return

    const typeCollector = typeMessage.createMessageComponentCollector({
      filter: (i: CollectedInteraction) => i.user.id === ctx.author!.id,
      max: 1,
      time: 30_000,
    })

    typeCollector.on('collect', async (interaction: StringSelectMenuInteraction) => {
      contentType = interaction.values[0] as 'anime' | 'movie'

      // --- Loading state ---
      const loadingEmbed = new EmbedBuilder()
        .setTitle(ctx.locale('cmd.msearch.messages.searching', { query: search }))
        .setDescription(ctx.locale('cmd.msearch.messages.searching_description'))
        .setColor(client.color.yellow)

      await interaction.update({ embeds: [loadingEmbed], components: [] })

      // --- Fetch results ---
      const fetchPage = async (pageIndex: number): Promise<SearchDataResponse | null> => {
        if (cache.pages[pageIndex]) return cache.pages[pageIndex]

        const token = cache.nextPageTokens[pageIndex - 1] || null
        let response: SearchResponse | null = null

        if (contentType === 'anime') {
          response = await client.animezey.searchAnime(search, token)
        } else {
          response = await client.animezey.searchMovie(search, token)
        }

        if (!response) return null

        const filtered: SearchDataResponse = {
          ...response.data,
          files: response.data.files.filter(
            (f) => f.mimeType === 'video/x-matroska' || f.mimeType === 'video/mp4'
          ),
        }

        cache.pages[pageIndex] = filtered
        cache.nextPageTokens[pageIndex] = response.data.nextPageToken
        return filtered
      }

      const initialData = await fetchPage(0)
      if (!initialData || initialData.files.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle(ctx.locale('cmd.msearch.messages.results_title', { query: search }))
          .setDescription(ctx.locale('cmd.msearch.messages.results_empty'))
          .setColor(client.color.red)

        await typeMessage.edit({ embeds: [emptyEmbed], components: [] })
        return
      }

      // --- Build results UI ---
      let pageIdx = 0
      let itemIdx = 0

      const buildResultEmbed = (files: FileResponse[], page: number, itemPage: number) => {
        const start = itemPage * ITEMS_PER_PAGE
        const slice = files.slice(start, start + ITEMS_PER_PAGE)
        const typeLabel = contentType === 'anime' ? '📺 Anime' : '🎬 Filme'

        return new EmbedBuilder()
          .setTitle(ctx.locale('cmd.msearch.messages.results_title', { query: search }))
          .setDescription(
            slice
              .map(
                (f, i) =>
                  `${EMOJI_NUMBERS[i]} **${formatDisplayName(f.name)}**\n` +
                  `╰ ${formatFileSize(f.size)} · ${f.mimeType.split('/')[1].toUpperCase()}`
              )
              .join('\n\n')
          )
          .setColor(client.color.main)
          .setFooter({
            text: `${typeLabel} · Pág ${page + 1} · ${start + 1}-${start + slice.length} de ${files.length}`,
            iconURL: ctx.author!.avatarURL() || undefined,
          })
      }

      const buildNavRow = (page: number, itemPage: number, totalItems: number) => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prevPage')
            .setEmoji('⏪')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('prevItems')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(itemPage === 0),
          new ButtonBuilder().setCustomId('cancel').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('nextItems')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled((itemPage + 1) * ITEMS_PER_PAGE >= totalItems),
          new ButtonBuilder()
            .setCustomId('nextPage')
            .setEmoji('⏩')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!cache.nextPageTokens[page])
        )
      }

      const buildPlayRow = (itemPage: number, totalItems: number) => {
        const start = itemPage * ITEMS_PER_PAGE
        const count = Math.min(ITEMS_PER_PAGE, totalItems - start)
        const row = new ActionRowBuilder<ButtonBuilder>()

        for (let i = 0; i < count; i++) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`play_${i}`)
              .setLabel(ctx.locale('cmd.msearch.buttons.watch', { number: EMOJI_NUMBERS[i] }))
              .setStyle(ButtonStyle.Success)
          )
        }
        return row
      }

      const updateResults = async (inter: ButtonInteraction) => {
        const data = await fetchPage(pageIdx)
        if (!data) {
          await inter.update({
            content: ctx.locale('cmd.msearch.messages.fetch_error'),
            embeds: [],
            components: [],
          })
          return
        }

        const total = data.files.length
        await inter.update({
          content: '',
          embeds: [buildResultEmbed(data.files, pageIdx, itemIdx)],
          components: [buildNavRow(pageIdx, itemIdx, total), buildPlayRow(itemIdx, total)],
        })
      }

      // Show initial results
      const total = initialData.files.length
      await typeMessage.edit({
        embeds: [buildResultEmbed(initialData.files, 0, 0)],
        components: [buildNavRow(0, 0, total), buildPlayRow(0, total)],
      })

      // --- Results collector ---
      const collector = typeMessage.createMessageComponentCollector({
        filter: (i: CollectedInteraction) => i.user.id === ctx.author!.id,
        time: COLLECTOR_TIMEOUT,
      })

      collector.on('collect', async (btnInteraction: ButtonInteraction) => {
        const id = btnInteraction.customId

        if (id === 'cancel') {
          collector.stop('cancelled')
          return
        }

        if (id.startsWith('play_')) {
          const playIdx = Number.parseInt(id.split('_')[1], 10)
          const start = itemIdx * ITEMS_PER_PAGE
          const file = cache.pages[pageIdx]?.files[start + playIdx]
          if (!file) return

          await btnInteraction.deferReply()

          const track: StreamTrack = {
            type: 'url',
            source: client.animezey.getStreamUrl(file),
            title: file.name,
            requester: { id: ctx.author!.id, username: ctx.author!.username },
            deleteAfterPlay: false,
          }

          try {
            const position = await client.selfbot.enqueue(
              ctx.guild!.id,
              ctx.member!,
              track,
              ctx.channel!.id
            )

            const embed = new EmbedBuilder().setTimestamp()

            if (position === 0) {
              embed
                .setAuthor({
                  name: ctx.locale('cmd.msearch.messages.live_author'),
                  iconURL: client.config.links.live,
                })
                .setTitle(formatDisplayName(file.name))
                .setDescription(ctx.locale('cmd.msearch.messages.now_streaming'))
                .setColor(client.color.green)
            } else {
              embed
                .setTitle(formatDisplayName(file.name))
                .setDescription(
                  ctx.locale('cmd.msearch.messages.queued_position', { position: String(position) })
                )
                .setColor(client.color.blue)
            }

            embed.addFields(
              {
                name: ctx.locale('cmd.msearch.fields.size'),
                value: formatFileSize(file.size),
                inline: true,
              },
              {
                name: ctx.locale('cmd.msearch.fields.modified_at'),
                value: dateFormatter.format(new Date(file.modifiedTime)),
                inline: true,
              },
              {
                name: ctx.locale('cmd.msearch.fields.download'),
                value: `[Download](${client.animezey.getStreamUrl(file)})`,
                inline: true,
              }
            )

            embed.setFooter({
              text: ctx.locale('player.trackStart.requested_by', { user: ctx.author!.username }),
              iconURL: ctx.author!.avatarURL() || ctx.author!.defaultAvatarURL,
            })

            await btnInteraction.editReply({ embeds: [embed] })
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erro ao enfileirar'
            const errEmbed = new EmbedBuilder()
              .setDescription(`❌ ${msg}`)
              .setColor(client.color.red)

            await btnInteraction.editReply({ embeds: [errEmbed] })
          }
          return
        }

        // Navigation
        if (id === 'prevPage') {
          pageIdx--
          itemIdx = 0
        } else if (id === 'nextPage') {
          pageIdx++
          itemIdx = 0
        } else if (id === 'prevItems') {
          itemIdx--
        } else if (id === 'nextItems') {
          itemIdx++
        }

        await updateResults(btnInteraction)
      })

      collector.on('end', async (_collected, reason) => {
        const closedEmbed = new EmbedBuilder()
          .setTitle(ctx.locale('cmd.msearch.messages.search_closed_title'))
          .setDescription(
            reason === 'cancelled'
              ? ctx.locale('cmd.msearch.messages.search_closed_description')
              : ctx.locale('cmd.msearch.messages.timeout_description')
          )
          .setColor(client.color.red)

        await typeMessage.edit({ embeds: [closedEmbed], components: [] }).catch(() => {})
      })
    })

    typeCollector.on('end', async (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle(ctx.locale('cmd.msearch.messages.timeout_title'))
          .setDescription(ctx.locale('cmd.msearch.messages.timeout_description'))
          .setColor(client.color.red)

        await typeMessage.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {})
      }
    })
  }
}

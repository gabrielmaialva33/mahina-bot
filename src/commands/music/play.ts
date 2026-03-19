import type {
  APIApplicationCommandOptionChoice,
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  VoiceChannel,
} from 'discord.js'
import type { SearchResult } from 'lavalink-client'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { ensureConnectedPlayer, startPlayerIfIdle } from '#common/player_runtime'

const AUTOCOMPLETE_TIMEOUT_MS = 2500

function buildAutocompleteValue(track: {
  info: { title: string; author: string; uri?: string | null; identifier?: string | null }
}): string {
  const candidates = [
    track.info.uri?.trim(),
    track.info.identifier?.trim(),
    `${track.info.title} ${track.info.author}`.trim(),
    track.info.title.trim(),
  ].filter((value): value is string => Boolean(value && value.length > 0))

  const safeValue = candidates.find((value) => value.length <= 100)
  return safeValue ?? track.info.title.trim().slice(0, 100)
}

async function respondSafely(
  interaction: AutocompleteInteraction,
  choices: APIApplicationCommandOptionChoice<string>[]
): Promise<void> {
  if (interaction.responded) return
  await interaction.respond(choices)
}

export default class Play extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'play',
      description: {
        content: 'cmd.play.description',
        examples: [
          'play example',
          'play https://www.youtube.com/watch?v=example',
          'play https://open.spotify.com/track/example',
          'play http://www.example.com/example.mp3',
        ],
        usage: 'play <song>',
      },
      category: 'music',
      aliases: ['p'],
      cooldown: 3,
      args: true,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          'SendMessages',
          'ReadMessageHistory',
          'ViewChannel',
          'EmbedLinks',
          'Connect',
          'Speak',
        ],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'song',
          description: 'cmd.play.options.song',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const query = args.join(' ')
    await ctx.sendDeferMessage(ctx.locale('cmd.play.loading'))
    const memberVoiceChannel = (ctx.member as any).voice.channel as VoiceChannel
    const player = await ensureConnectedPlayer(client, ctx, memberVoiceChannel)

    const response = (await player.search({ query: query }, ctx.author)) as SearchResult
    const embed = this.client.embed()

    if (!response || response.tracks?.length === 0) {
      return await ctx.editMessage({
        content: '',
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.play.errors.search_error')),
        ],
      })
    }

    await player.queue.add(response.loadType === 'playlist' ? response.tracks : response.tracks[0])

    if (response.loadType === 'playlist') {
      await ctx.editMessage({
        content: '',
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              ctx.locale('cmd.play.added_playlist_to_queue', { length: response.tracks.length })
            ),
        ],
      })
    } else {
      await ctx.editMessage({
        content: '',
        embeds: [
          embed.setColor(this.client.color.main).setDescription(
            ctx.locale('cmd.play.added_to_queue', {
              title: response.tracks[0].info.title,
              uri: response.tracks[0].info.uri,
            })
          ),
        ],
      })
    }
    await startPlayerIfIdle(player)
  }

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused(true)
    const query = focusedValue?.value.trim()

    if (!query || query.length < 2) {
      return await respondSafely(interaction, [])
    }

    try {
      this.client.logger.debug(`Play autocomplete query: ${query}`)

      const res = (await Promise.race([
        this.client.manager.search(query, interaction.user),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), AUTOCOMPLETE_TIMEOUT_MS)
        }),
      ])) as Awaited<ReturnType<typeof this.client.manager.search>> | null

      if (!res) {
        this.client.logger.warn(`Play autocomplete timed out for query: ${query}`)
        return await respondSafely(interaction, [])
      }

      if (res.loadType !== 'search') {
        this.client.logger.debug(
          `Play autocomplete empty/non-search result for query: ${query} (${res.loadType})`
        )
        return await respondSafely(interaction, [])
      }

      const songs: ApplicationCommandOptionChoiceData[] = res.tracks.slice(0, 10).map((track) => {
        const name = `${track.info.title} by ${track.info.author}`
        return {
          name: name.length > 100 ? `${name.substring(0, 97)}...` : name,
          value: buildAutocompleteValue(track),
        }
      })

      this.client.logger.debug(
        `Play autocomplete returned ${songs.length} option(s) for query: ${query}`
      )
      return await respondSafely(interaction, songs)
    } catch (error) {
      this.client.logger.error('Play autocomplete failed:', error)
      return await respondSafely(interaction, [])
    }
  }
}

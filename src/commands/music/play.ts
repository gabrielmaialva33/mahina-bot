import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  VoiceChannel,
} from 'discord.js'
import type { SearchResult } from 'lavalink-client'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { ensureConnectedPlayer, startPlayerIfIdle } from '#common/player_runtime'

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

    if (!focusedValue?.value.trim()) {
      return interaction.respond([])
    }

    const res = await this.client.manager.search(focusedValue.value.trim(), interaction.user)
    const songs: ApplicationCommandOptionChoiceData[] = []

    if (res.loadType === 'search') {
      res.tracks.slice(0, 10).forEach((track: { info: { title: any; author: any; uri: any } }) => {
        const name = `${track.info.title} by ${track.info.author}`
        songs.push({
          name: name.length > 100 ? `${name.substring(0, 97)}...` : name,
          value: track.info.uri,
        })
      })
    }

    return await interaction.respond(songs)
  }
}

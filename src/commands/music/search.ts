import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  type TextChannel,
  type VoiceChannel,
} from 'discord.js'
import type { Player, SearchResult, Track } from 'lavalink-client'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { enqueueTrack, ensureConnectedPlayer } from '#common/player_runtime'

export default class Search extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'search',
      description: {
        content: 'cmd.search.description',
        examples: ['search example'],
        usage: 'search <song>',
      },
      category: 'music',
      aliases: ['sc'],
      cooldown: 3,
      args: true,
      vote: true,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'song',
          description: 'cmd.search.options.song',
          type: 3,
          required: true,
        },
      ],
    })
  }

  private async ensurePlayer(client: MahinaBot, ctx: Context, memberVoiceChannel: VoiceChannel) {
    return ensureConnectedPlayer(client, ctx, memberVoiceChannel)
  }

  private buildTrackAddedEmbed(ctx: Context, title: string, uri?: string | null) {
    return this.client.embed().setColor(this.client.color.main).setDescription(
      ctx.locale('cmd.search.messages.added_to_queue', {
        title,
        uri,
      })
    )
  }

  private buildSearchMenu(response: SearchResult, ctx: Context) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select-track')
      .setPlaceholder(ctx.locale('cmd.search.select'))
      .addOptions(
        response.tracks.slice(0, 10).map((track: Track, index: number) => ({
          label: `${index + 1}. ${track.info.title}`,
          description: track.info.author,
          value: index.toString(),
        }))
      )

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
  }

  private async enqueueTrack(player: Player, track: Track): Promise<void> {
    await enqueueTrack(player, track)
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const embed = this.client.embed().setColor(this.client.color.main)
    const query = args.join(' ')
    const memberVoiceChannel = (ctx.member as any).voice.channel as VoiceChannel
    const player = await this.ensurePlayer(client, ctx, memberVoiceChannel)

    const response = (await player.search({ query: query }, ctx.author)) as SearchResult

    if (!response || response.tracks?.length === 0) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setDescription(ctx.locale('cmd.search.errors.no_results'))
            .setColor(this.client.color.red),
        ],
      })
    }

    const row = this.buildSearchMenu(response, ctx)

    if (response.loadType !== 'search' || response.tracks.length <= 5) {
      const track = response.tracks[0]
      if (!track) return
      await this.enqueueTrack(player, track)

      return await ctx.sendMessage({
        embeds: [this.buildTrackAddedEmbed(ctx, track.info.title, track.info.uri)],
      })
    }

    const embeds = response.tracks.map(
      (track: Track, index: number) =>
        `${index + 1}. [${track.info.title}](${track.info.uri}) - \`${track.info.author}\``
    )
    await ctx.sendMessage({
      embeds: [embed.setDescription(embeds.join('\n'))],
      components: [row],
    })

    const collector = (ctx.channel as TextChannel).createMessageComponentCollector({
      filter: (f: any) => f.user.id === ctx.author?.id,
      max: 1,
      time: 60000,
      idle: 60000 / 2,
    })
    collector.on('collect', async (int: any) => {
      const track = response.tracks[Number.parseInt(int.values[0])]
      await int.deferUpdate()
      if (!track) return
      await this.enqueueTrack(player, track)

      await ctx.editMessage({
        embeds: [this.buildTrackAddedEmbed(ctx, track.info.title, track.info.uri)],
        components: [],
      })
      return collector.stop()
    })
    collector.on('end', async () => {
      await ctx.editMessage({ components: [] })
    })
  }
}

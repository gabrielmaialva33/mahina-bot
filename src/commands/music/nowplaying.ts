import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Nowplaying extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'nowplaying',
      description: {
        content: 'cmd.nowplaying.description',
        examples: ['nowplaying'],
        usage: 'nowplaying',
      },
      category: 'music',
      aliases: ['np'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    const track = player.queue.current!
    const position = player.position
    const duration = track.info.duration
    const bar = client.utils.progressBar(position, duration, 20)

    const embed = this.client
      .embed()
      .setColor(this.client.color.main)
      .setAuthor({
        name: ctx.locale('cmd.nowplaying.now_playing'),
        iconURL: ctx.guild?.iconURL({})!,
      })
      .setThumbnail(track.info.artworkUrl!)
      .setDescription(
        ctx.locale('cmd.nowplaying.track_info', {
          title: track.info.title,
          uri: track.info.uri,
          requester: (track.requester as any).id,
          bar: bar,
        })
      )
      .addFields({
        name: '\u200b',
        value: `\`${client.utils.formatTime(position)} / ${client.utils.formatTime(duration)}\``,
      })

    return await ctx.sendMessage({ embeds: [embed] })
  }
}

import { Command, Context, BaseClient } from '#common/index'

export default class NowPlaying extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'nowplaying',
      description: {
        content: 'Mostra a música que está tocando',
        examples: ['nowplaying'],
        usage: 'nowplaying',
      },
      category: 'music',
      aliases: ['np'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    const track = player.current!
    const position = player.player.position
    const duration = track.info.length
    const bar = client.utils.progressBar(position, duration, 20)
    const embed1 = this.client
      .embed()
      .setColor(this.client.color.main)
      .setAuthor({ name: 'Now Playing', iconURL: ctx.guild!.iconURL({})! })
      .setThumbnail(track.info.artworkUrl!)
      .setDescription(
        `[${track.info.title}](${track.info.uri}) - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚: ${track.info.requestedBy}\n\n\`${bar}\``
      )
      .addFields({
        name: '\u200b',
        value: `\`${client.utils.formatTime(position)} / ${client.utils.formatTime(duration)}\``,
      })
    return await ctx.sendMessage({ embeds: [embed1] })
  }
}

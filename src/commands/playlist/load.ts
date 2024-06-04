import { ApplicationCommandOptionType } from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'

export default class Load extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'load',
      description: {
        content: 'Carrega uma playlist',
        examples: ['load <playlist>'],
        usage: 'load <playlist>',
      },
      category: 'playlist',
      aliases: [],
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
          name: 'playlist',
          description: 'O nome da playlist que você quer carregar',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.author) return

    let player = client.queue.get(ctx.guild.id)
    const playlist = args.join(' ').replace(/\s/g, '')
    const playlistData = (await client.db.getPlaylist(ctx.author.id, playlist)) as any
    if (!playlistData)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝘼 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙣𝙖̃𝙤 𝙚𝙭𝙞𝙨𝙩𝙚',
            color: client.color.red,
          },
        ],
      })
    for await (const song of JSON.parse(playlistData.songs).map((s: any) => s)) {
      const vc = ctx.member as any
      if (!player)
        player = await client.queue.create(
          ctx.guild!,
          vc.voice.channel,
          ctx.channel,
          client.shoukaku.options.nodeResolver(client.shoukaku.nodes)
        )

      const track = player.buildTrack(song, ctx.author!)
      player.queue.push(track)
      player.isPlaying()
    }
    return await ctx.sendMessage({
      embeds: [
        {
          description: `𝘾𝙖𝙧𝙧𝙚𝙜𝙤𝙪 \`${playlistData.name}\` 𝙘𝙤𝙢 \`${JSON.parse(playlistData.songs).length}\` 𝙢𝙪́𝙨𝙞𝙘𝙖𝙨`,
          color: client.color.main,
        },
      ],
    })
  }
}

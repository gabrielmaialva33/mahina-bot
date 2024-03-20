import { LoadType } from 'shoukaku'

import { Command, Context, Mahina } from '#common/index'

export default class PlayNext extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'playnext',
      description: {
        content: 'Adiciona uma música para tocar em seguida',
        examples: [
          'playnext https://www.youtube.com/watch?v=QH2-TGUlwu4',
          'playnext https://open.spotify.com/track/6WrI0LAC5M1Rw2MnX2ZvEg',
        ],
        usage: 'playnext <song>',
      },
      category: 'music',
      aliases: ['pn'],
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
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'song',
          description: 'A música que deseja tocar',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const query = args.join(' ')
    let player = client.queue.get(ctx.guild!.id)
    const vc = ctx.member as any
    if (!player) player = await client.queue.create(ctx.guild!, vc.voice.channel, ctx.channel)

    const res = await this.client.queue.search(query)
    const embed = this.client.embed()
    switch (res!.loadType) {
      case LoadType.ERROR:
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription('𝙊𝙘𝙤𝙧𝙧𝙚𝙪 𝙪𝙢 𝙚𝙧𝙧𝙤 𝙙𝙪𝙧𝙖𝙣𝙩𝙚 𝙖 𝙥𝙚𝙨𝙦𝙪𝙞𝙨𝙖.'),
          ],
        })
        break
      case LoadType.EMPTY:
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription('𝙉𝙖̃𝙤 𝙛𝙤𝙧𝙖𝙢 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙖𝙙𝙤𝙨 𝙧𝙚𝙨𝙪𝙡𝙩𝙖𝙙𝙤𝙨.'),
          ],
        })
        break
      case LoadType.TRACK: {
        const track = player.buildTrack(res!.data, ctx.author!)
        if (player.queue.length > client.env.MAX_QUEUE_SIZE)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                ),
            ],
          })
        player.queue.splice(0, 0, track)
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res!.data.info.title}](${res!.data.info.uri}) 𝙖 𝙛𝙞𝙡𝙖.`
              ),
          ],
        })
        break
      }
      case LoadType.PLAYLIST: {
        if (res!.data.tracks.length > client.env.MAX_PLAYLIST_SIZE)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `💽 𝘼 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́  ${client.env.MAX_PLAYLIST_SIZE}.`
                ),
            ],
          })
        for (const track of res!.data.tracks) {
          const pl = player.buildTrack(track, ctx.author!)
          if (player.queue.length > client.env.MAX_QUEUE_SIZE)
            return await ctx.sendMessage({
              embeds: [
                embed
                  .setColor(this.client.color.red)
                  .setDescription(
                    `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                  ),
              ],
            })
          player.queue.splice(0, 0, pl)
        }
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(`🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 ${res!.data.tracks.length} 𝙖 𝙛𝙞𝙡𝙖.`),
          ],
        })
        break
      }
      case LoadType.SEARCH: {
        const track1 = player.buildTrack(res!.data[0], ctx.author!)
        if (player.queue.length > client.env.MAX_QUEUE_SIZE)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                ),
            ],
          })
        player.queue.splice(0, 0, track1)
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res!.data[0].info.title}](${res!.data[0].info.uri}) 𝙖 𝙛𝙞𝙡𝙖.`
              ),
          ],
        })
        break
      }
    }
  }
}

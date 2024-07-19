import { LoadType } from 'shoukaku'

import { BaseClient, Command, Context } from '#common/index'

export default class Play extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'play',
      description: {
        content: 'Tocar música no canal de voz.',
        examples: [
          'play https://www.youtube.com/watch?v=A7blkCcowvk',
          'play https://open.spotify.com/track/7H0ya83CMmgFcOhw0UB6ow',
        ],
        usage: 'play <song>',
      },
      category: 'music',
      aliases: ['p'],
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
          description: 'A música que você quer tocar',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const query = args.join(' ')
    if (!ctx.guild) return

    await ctx.sendDeferMessage('🔍 𝘽𝙪𝙨𝙘𝙖𝙣𝙙𝙤 𝙢𝙪́𝙨𝙞𝙘𝙖...')
    let player = client.queue.get(ctx.guild.id)
    const vc = ctx.member as any
    if (!player) player = await client.queue.create(ctx.guild, vc.voice.channel, ctx.channel)

    const res = await this.client.queue.search(query)
    if (!res) return

    const embed = this.client.embed()
    switch (res.loadType) {
      case LoadType.ERROR:
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription('🥺 𝙊𝙘𝙤𝙧𝙧𝙚𝙪 𝙪𝙢 𝙚𝙧𝙧𝙤 𝙙𝙪𝙧𝙖𝙣𝙩𝙚 𝙖 𝙥𝙚𝙨𝙦𝙪𝙞𝙨𝙖.'),
          ],
        })
        break
      case LoadType.EMPTY:
        ctx.sendMessage({
          embeds: [
            embed.setColor(this.client.color.red).setDescription('😓 𝙈𝙖𝙣𝙖̃.. 𝙣𝙖̃𝙤 𝙖𝙘𝙝𝙚𝙞 𝙣𝙖𝙙𝙚'),
          ],
        })
        break
      case LoadType.TRACK: {
        if (!ctx.author) return

        const track = player.buildTrack(res.data, ctx.author)
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
        player.queue.push(track)
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res.data.info.title}](${res.data.info.uri}) 𝙣𝙖 𝙛𝙞𝙡𝙖.`
              ),
          ],
        })
        break
      }
      case LoadType.PLAYLIST: {
        if (res.data.tracks.length > client.env.MAX_PLAYLIST_SIZE)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `💽 𝘼 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́  ${client.env.MAX_PLAYLIST_SIZE}.`
                ),
            ],
          })
        for (const track of res.data.tracks) {
          if (!ctx.author) return

          const pl = player.buildTrack(track, ctx.author)
          if (player.queue.length > client.env.MAX_QUEUE_SIZE)
            return await ctx.sendMessage({
              embeds: [
                embed
                  .setColor(this.client.color.red)
                  .setDescription(
                    `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́  ${client.env.MAX_QUEUE_SIZE}.`
                  ),
              ],
            })
          player.queue.push(pl)
        }
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(`🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 ${res.data.tracks.length} 𝙖 𝙛𝙞𝙡𝙖.`),
          ],
        })
        break
      }
      case LoadType.SEARCH: {
        if (!ctx.author) return
        const track1 = player.buildTrack(res.data[0], ctx.author)
        if (player.queue.length > client.env.MAX_QUEUE_SIZE)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́  ${client.env.MAX_QUEUE_SIZE}.`
                ),
            ],
          })
        player.queue.push(track1)
        await player.isPlaying()
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res.data[0].info.title}](${res.data[0].info.uri}) 𝙖 𝙛𝙞𝙡𝙖.`
              ),
          ],
        })
        break
      }
    }
  }
}

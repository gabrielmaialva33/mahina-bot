import { BaseClient, Command, Context } from '#common/index'

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class _247 extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: '247',
      description: {
        content: 'Mantém o bot 24/7 no canal de voz',
        examples: ['247'],
        usage: '247',
      },
      category: 'config',
      aliases: ['stay'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const embed = client.embed()
    let player = client.shoukaku.players.get(ctx.guild!.id) as any

    const data = client.db.get_247(ctx.guild!.id)
    const vc = ctx.member as any
    if (!data) {
      client.db.set_247(ctx.guild!.id, ctx.channel!.id, vc.voice.channel.id)
      if (!player)
        player = await client.queue.create(
          ctx.guild!,
          vc.voice.channel,
          ctx.channel,
          client.shoukaku.options.nodeResolver(client.shoukaku.nodes)
        )
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`**𝙊 𝙢𝙤𝙙𝙤 24/7 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤**`).setColor(client.color.main)],
      })
    } else {
      client.db.delete_247(ctx.guild!.id)
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`**𝙊 𝙢𝙤𝙙𝙤 24/7 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤**`).setColor(client.color.red)],
      })
    }
  }
}

import { Command, Context, Mahina } from '#common/index'

export default class Join extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'join',
      description: {
        content: 'Entrar no canal de voz',
        examples: ['join'],
        usage: 'join',
      },
      category: 'music',
      aliases: ['j'],
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
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: Mahina, ctx: Context): Promise<any> {
    let player = client.queue.get(ctx.guild!.id)
    const embed = this.client.embed()
    if (!player) {
      const vc = ctx.member as any
      player = await client.queue.create(
        ctx.guild!,
        vc.voice.channel,
        ctx.channel,
        client.shoukaku.options.nodeResolver(client.shoukaku.nodes)
      )
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              `𝙀𝙣𝙩𝙧𝙚𝙞 𝙚𝙢 <#${player.node.manager.connections.get(ctx.guild!.id)!.channelId}>`
            ),
        ],
      })
    } else {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              `𝙅𝙖́ 𝙚𝙨𝙩𝙤𝙪 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙚𝙢 <#${player.node.manager.connections.get(ctx.guild!.id)!.channelId}>`
            ),
        ],
      })
    }
  }
}

import { Command, Context, Mahina } from '#common/index'

export default class Loop extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'loop',
      description: {
        content: 'Loopa a música ou a fila',
        examples: ['loop', 'loop queue', 'loop song'],
        usage: 'loop',
      },
      category: 'general',
      aliases: ['loop'],
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

  async run(client: Mahina, ctx: Context): Promise<any> {
    const embed = client.embed().setColor(client.color.main)
    const player = client.queue.get(ctx.guild!.id)

    switch (player.loop) {
      case 'off':
        player.loop = 'repeat'
        return await ctx.sendMessage({
          embeds: [embed.setDescription(`**𝙇𝙤𝙤𝙥𝙖𝙣𝙙𝙤 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖**`).setColor(client.color.main)],
        })
      case 'repeat':
        player.loop = 'queue'
        return await ctx.sendMessage({
          embeds: [embed.setDescription(`**𝙇𝙤𝙤𝙥𝙖𝙣𝙙𝙤 𝙖 𝙛𝙞𝙡𝙖**`).setColor(client.color.main)],
        })
      case 'queue':
        player.loop = 'off'
        return await ctx.sendMessage({
          embeds: [embed.setDescription(`**𝙇𝙤𝙤𝙥 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤**`).setColor(client.color.main)],
        })
    }
  }
}

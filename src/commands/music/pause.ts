import { Command, Context, BaseClient } from '#common/index'

export default class Pause extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'pause',
      description: {
        content: 'Pausa a música que está tocando',
        examples: ['pause'],
        usage: 'pause',
      },
      category: 'music',
      aliases: [],
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
    const embed = this.client.embed()
    if (!player.paused) {
      player.pause()
      return await ctx.sendMessage({
        embeds: [embed.setColor(this.client.color.main).setDescription(`𝙋𝙖𝙪𝙨𝙤𝙪 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖`)],
      })
    } else {
      return await ctx.sendMessage({
        embeds: [embed.setColor(this.client.color.red).setDescription(`𝙈𝙪́𝙨𝙞𝙘𝙖 𝙟𝙖́ 𝙚𝙢 𝙥𝙖𝙪𝙨𝙖`)],
      })
    }
  }
}

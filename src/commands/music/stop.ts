import { Command, Context, BaseClient } from '#common/index'

export default class Stop extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'stop',
      description: {
        content: 'Para a música que está tocando',
        examples: ['stop'],
        usage: 'stop',
      },
      category: 'music',
      aliases: ['sp'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: true,
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

    player.queue = []
    player.stop()

    return await ctx.sendMessage({
      embeds: [
        embed.setColor(this.client.color.main).setDescription(`𝙋𝙖𝙧𝙤𝙪 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙚 𝙡𝙞𝙢𝙥𝙤𝙪 𝙖 𝙛𝙞𝙡𝙖`),
      ],
    })
  }
}

import { BaseClient, Command, Context } from '#common/index'

export default class AutoPlay extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'autoplay',
      description: {
        content: 'Alterna a reprodução automática',
        examples: ['autoplay'],
        usage: 'autoplay',
      },
      category: 'music',
      aliases: ['ap'],
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

    const autoplay = player.autoplay
    if (!autoplay) {
      embed.setDescription(`𝘼𝙪𝙩𝙤𝙥𝙡𝙖𝙮 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤`).setColor(client.color.main)
      player.setAutoplay(true)
    } else {
      embed.setDescription(`𝘼𝙪𝙩𝙤𝙥𝙡𝙖𝙮 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤`).setColor(client.color.main)
      player.setAutoplay(false)
    }
    ctx.sendMessage({ embeds: [embed] })
  }
}

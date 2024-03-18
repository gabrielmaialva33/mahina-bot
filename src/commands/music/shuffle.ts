import { Command, Context, Mahina } from '#common/index'

export default class Shuffle extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'shuffle',
      description: {
        content: 'Embaralha a fila de músicas.',
        examples: ['shuffle'],
        usage: 'shuffle',
      },
      category: 'music',
      aliases: ['sh'],
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
  async run(client: Mahina, ctx: Context): Promise<any> {
    if (!ctx.guild) return

    const player = client.queue.get(ctx.guild.id)
    const embed = this.client.embed()
    if (!player.queue.length)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙈𝙖𝙣𝙖̃.. 𝙢𝙖𝙨 𝙣𝙚𝙢 𝙩𝙚𝙢 𝙢𝙪𝙨𝙞𝙦𝙪𝙚 𝙣𝙖 𝙛𝙞𝙡𝙚.'),
        ],
      })
    player.setShuffle(true)

    return await ctx.sendMessage({
      embeds: [embed.setColor(this.client.color.main).setDescription(`𝙀𝙢𝙗𝙖𝙧𝙖𝙡𝙝𝙖𝙙𝙤 𝙢𝙖𝙣𝙖̃..`)],
    })
  }
}

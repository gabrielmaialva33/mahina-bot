import { Command, Context, Mahina } from '#common/index'

export default class ClearQueue extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'clearqueue',
      description: {
        content: 'Limpa a fila de músicas.',
        examples: ['clearqueue'],
        usage: 'clearqueue',
      },
      category: 'music',
      aliases: ['cq'],
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
            .setDescription('𝙈𝙖𝙣𝙖̃.. 𝙢𝙖𝙨 𝙣𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖𝙨 𝙣𝙖 𝙛𝙞𝙡𝙖.'),
        ],
      })
    player.queue = []

    return await ctx.sendMessage({
      embeds: [embed.setColor(this.client.color.main).setDescription(`𝙇𝙞𝙢𝙥𝙚𝙞 𝙖 𝙛𝙞𝙡𝙖 :3`)],
    })
  }
}

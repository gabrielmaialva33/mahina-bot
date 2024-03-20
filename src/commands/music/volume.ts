import { Command, Context, Mahina } from '#common/index'

export default class Volume extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'volume',
      description: {
        content: 'Define o volume da música.',
        examples: ['volume 100'],
        usage: 'volume <number>',
      },
      category: 'music',
      aliases: ['vol'],
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'number',
          description: 'The volume you want to set',
          type: 4,
          required: true,
        },
      ],
    })
  }
  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.guild) return

    const player = client.queue.get(ctx.guild.id)
    const embed = this.client.embed()
    const number = Number(args[0])
    if (Number.isNaN(number))
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙈𝙖𝙣𝙖̃.. 𝙫𝙘 𝙚 𝙗𝙪𝙧𝙧𝙚..😐 𝙥𝙖𝙨𝙨𝙖 𝙪𝙢 𝙣𝙪𝙢𝙚𝙧𝙤..'),
        ],
      })
    if (number > 200)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙈𝙖𝙣𝙖̃.. 😐 𝙤 𝙫𝙤𝙡𝙪𝙢𝙚 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙨𝙚𝙧 𝙢𝙖𝙞𝙤𝙧 𝙦𝙪𝙚 200.'),
        ],
      })
    if (number < 0)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙈𝙖𝙣𝙖̃.. 𝙗𝙪𝙧𝙧𝙚..😐 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙨𝙚𝙧 𝙢𝙚𝙣𝙤𝙧 𝙦𝙪𝙚 0'),
        ],
      })
    player.player.setGlobalVolume(number)
    return await ctx.sendMessage({
      embeds: [
        embed
          .setColor(this.client.color.main)
          .setDescription(`𝙑𝙤𝙡𝙪𝙢𝙚 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙤 𝙥𝙖𝙧𝙖 ${player.player.volume} 🤗`),
      ],
    })
  }
}

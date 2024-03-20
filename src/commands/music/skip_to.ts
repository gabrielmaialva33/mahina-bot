import { Command, Context, BaseClient } from '#common/index'

export default class SkipTo extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'skipto',
      description: {
        content: 'Avança para a música desejada',
        examples: ['skipto 3'],
        usage: 'skipto <number>',
      },
      category: 'music',
      aliases: ['st'],
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
          description: 'O número da música que deseja pular',
          type: 4,
          required: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)
    const embed = this.client.embed()
    if (!player.queue.length)
      return await ctx.sendMessage({
        embeds: [embed.setColor(this.client.color.red).setDescription('𝙉𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖𝙨 𝙣𝙖 𝙛𝙞𝙡𝙖.')],
      })
    if (Number.isNaN(Number(args[0])))
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription('𝙄𝙨𝙨𝙤 𝙣𝙖̃𝙤 𝙚́ 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤.'),
        ],
      })
    if (Number(args[0]) > player.queue.length)
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription('𝙄𝙨𝙨𝙤 𝙣𝙖̃𝙤 𝙚́ 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤.'),
        ],
      })
    if (Number(args[0]) < 1)
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription('𝙄𝙨𝙨𝙤 𝙣𝙖̃𝙤 𝙚́ 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤.'),
        ],
      })
    player.skip(Number(args[0]))

    return await ctx.sendMessage({
      embeds: [
        embed
          .setColor(this.client.color.main)
          .setDescription(`𝙋𝙪𝙡𝙤𝙪 𝙥𝙖𝙧𝙖 𝙤 𝙣𝙪́𝙢𝙚𝙧𝙤 ${args[0]} 𝙙𝙖 𝙛𝙞𝙡𝙖`),
      ],
    })
  }
}

import { Command, Context, Mahina } from '#common/index'

export default class Seek extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'seek',
      description: {
        content: 'Avança para um determinado tempo na música',
        examples: ['seek 1m, seek 1h 30m'],
        usage: 'seek <time>',
      },
      category: 'music',
      aliases: ['se'],
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'time',
          description: 'O tempo para avançar',
          type: 3,
          required: true,
        },
      ],
    })
  }

  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)
    const embed = this.client.embed()

    const time = client.utils.parseTime(args[0])
    if (!time)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙁𝙤𝙧𝙢𝙖𝙩𝙤 𝙙𝙚 𝙩𝙚𝙢𝙥𝙤 𝙞𝙣𝙫𝙖́𝙡𝙞𝙙𝙤. 𝙀𝙭: 1𝙢, 1𝙝 30𝙢, 1𝙝 30𝙢 20𝙨'),
        ],
      })
    player.seek(time)

    return await ctx.sendMessage({
      embeds: [embed.setColor(this.client.color.main).setDescription(`A𝘼𝙫𝙖𝙣𝙘̧𝙖𝙣𝙙𝙤 𝙥𝙖𝙧𝙖 ${args[0]}`)],
    })
  }
}

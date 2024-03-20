import { Command, Context, BaseClient } from '#common/index'

export default class Resume extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'resume',
      description: {
        content: 'Continua a música que está pausada',
        examples: ['resume'],
        usage: 'resume',
      },
      category: 'music',
      aliases: ['r'],
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
    if (!player.paused)
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription('𝙊 𝙥𝙡𝙖𝙮𝙚𝙧 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙥𝙖𝙪𝙨𝙖𝙙𝙤.'),
        ],
      })
    player.pause()

    return await ctx.sendMessage({
      embeds: [embed.setColor(this.client.color.main).setDescription(`𝙍𝙚𝙩𝙤𝙢𝙖𝙣𝙙𝙤 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖.. 🎶`)],
    })
  }
}

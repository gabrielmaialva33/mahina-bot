import { Command, Context, BaseClient } from '#common/index'

export default class Skip extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'skip',
      description: {
        content: 'Pula a música atual.',
        examples: ['skip'],
        usage: 'skip',
      },
      category: 'music',
      aliases: ['sk'],
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
    if (!ctx.guild) return

    const player = client.queue.get(ctx.guild.id)
    const embed = this.client.embed()
    if (player.queue.length === 0)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription('𝙈𝙖𝙣𝙖̃..🥺 𝙢𝙖𝙨 𝙣𝙚𝙢 𝙩𝙚𝙢 𝙢𝙪𝙨𝙞𝙦𝙪𝙚 𝙣𝙖 𝙛𝙞𝙡𝙚.'),
        ],
      })
    player.skip()
    if (!ctx.isInteraction) {
      ctx.message?.react('👍')
    } else {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              `𝘼𝙫𝙖𝙣𝙘̧𝙖𝙙𝙖 [${player.current?.info.title}](${player.current?.info.uri})`
            ),
        ],
      })
    }
  }
}

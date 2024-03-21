import { BaseClient, Command, Context } from '#common/index'

export default class Reset extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'reset',
      description: {
        content: 'Resets os filtros ativos',
        examples: ['reset'],
        usage: 'reset',
      },
      category: 'filters',
      aliases: ['reset'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: true,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    player.player.clearFilters()
    player.filters = []
    return await ctx.sendMessage({
      embeds: [
        {
          description: '𝙁𝙞𝙡𝙩𝙧𝙤𝙨 𝙛𝙤𝙧𝙖𝙢 𝙧𝙚𝙨𝙚𝙩𝙖𝙙𝙤𝙨',
          color: client.color.main,
        },
      ],
    })
  }
}

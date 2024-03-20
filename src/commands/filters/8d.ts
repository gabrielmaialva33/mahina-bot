import { Command, Context, BaseClient } from '#common/index'

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class _8d extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: '8d',
      description: {
        content: 'on/off o filtro 8D',
        examples: ['8d'],
        usage: '8d',
      },
      category: 'filters',
      aliases: ['3d'],
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
    if (!player) return
    if (player.filters.includes('8D')) {
      player.player.setRotation()
      player.filters.splice(player.filters.indexOf('8D'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 8𝘿 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤.',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setRotation({ rotationHz: 0.2 })
      player.filters.push('8D')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 8𝘿 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤.',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

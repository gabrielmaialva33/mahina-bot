import { BaseClient, Command, Context } from '#common/index'

export default class Tremolo extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'tremolo',
      description: {
        content: 'on/off o filtro tremolo',
        examples: ['tremolo'],
        usage: 'tremolo',
      },
      category: 'filters',
      aliases: ['tremolo'],
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
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    if (player.filters.includes('tremolo')) {
      player.player.setTremolo()
      player.filters.splice(player.filters.indexOf('tremolo'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙩𝙧𝙚𝙢𝙤𝙡𝙤 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setTremolo({ depth: 0.75, frequency: 4 })
      player.filters.push('tremolo')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙩𝙧𝙚𝙢𝙤𝙡𝙤 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

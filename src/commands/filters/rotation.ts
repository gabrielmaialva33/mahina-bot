import { BaseClient, Command, Context } from '#common/index'

export default class Rotation extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'rotation',
      description: {
        content: 'on/off o filtro rotation',
        examples: ['rotation'],
        usage: 'rotation',
      },
      category: 'filters',
      aliases: ['rt'],
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

    if (player.filters.includes('rotation')) {
      player.player.setRotation()
      player.filters.splice(player.filters.indexOf('rotation'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙙𝙚 𝙧𝙤𝙩𝙖𝙘̧𝙖̃𝙤 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setRotation({ rotationHz: 0 })
      player.filters.push('rotation')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙙𝙚 𝙧𝙤𝙩𝙖𝙘̧𝙖̃𝙤 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

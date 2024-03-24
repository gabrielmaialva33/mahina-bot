import { Command, Context, BaseClient } from '#common/index'

export default class Distorsion extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'distorsion',
      description: {
        content: 'on/off o filtro distorsion',
        examples: ['distorsion'],
        usage: 'distorsion',
      },
      category: 'filters',
      aliases: ['distorsion'],
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
    if (player.filters.includes('distorsion')) {
      player.player.setDistortion({})
      player.filters.splice(player.filters.indexOf('distorsion'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙙𝙚 𝙙𝙞𝙨𝙩𝙤𝙧𝙨𝙞𝙤𝙣 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setDistortion({
        sinOffset: 0,
        sinScale: 1,
        cosOffset: 0,
        cosScale: 1,
        tanOffset: 0,
        tanScale: 1,
        offset: 0,
        scale: 1,
      })
      player.filters.push('distorsion')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙙𝙚 𝙙𝙞𝙨𝙩𝙤𝙧𝙨𝙞𝙤𝙣 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

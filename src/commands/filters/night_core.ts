import { Command, Context, BaseClient } from '#common/index'

export default class NightCore extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'nightcore',
      description: {
        content: 'on/off o filtro nightcore',
        examples: ['nightcore'],
        usage: 'nightcore',
      },
      category: 'filters',
      aliases: ['nc'],
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
    if (player.filters.includes('nightcore')) {
      player.player.setTimescale()
      player.filters.splice(player.filters.indexOf('nightcore'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙉𝙞𝙜𝙝𝙩𝙘𝙤𝙧𝙚 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙙𝙤.',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setTimescale({ speed: 1.165, pitch: 1.125, rate: 1.05 })
      player.filters.push('nightcore')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙉𝙞𝙜𝙝𝙩𝙘𝙤𝙧𝙚 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

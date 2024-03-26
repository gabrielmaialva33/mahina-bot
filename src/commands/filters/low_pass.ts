import { BaseClient, Command, Context } from '#common/index'

export default class LowPass extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'lowpass',
      description: {
        content: 'on/off o filtro lowpass',
        examples: ['lowpass'],
        usage: 'lowpass <number>',
      },
      category: 'filters',
      aliases: ['lp'],
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
      slashCommand: false,
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    if (player.filters.includes('lowpass')) {
      player.player.setLowPass({})
      player.filters.splice(player.filters.indexOf('lowpass'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙡𝙤𝙬𝙥𝙖𝙨𝙨 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setLowPass({ smoothing: 20 })
      player.filters.push('lowpass')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙡𝙤𝙬𝙥𝙖𝙨𝙨 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

import { BaseClient, Command, Context } from '#common/index'

export default class Vibrato extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'vibrato',
      description: {
        content: 'on/off o filtro vibrato',
        examples: ['vibrato'],
        usage: 'vibrato',
      },
      category: 'filters',
      aliases: ['vb'],
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
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    if (player.filters.includes('vibrato')) {
      player.player.setVibrato()
      player.filters.splice(player.filters.indexOf('vibrato'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙑𝙞𝙗𝙧𝙖𝙩𝙤 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setVibrato({ depth: 0.75, frequency: 4 })
      player.filters.push('vibrato')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙑𝙞𝙗𝙧𝙖𝙩𝙤 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

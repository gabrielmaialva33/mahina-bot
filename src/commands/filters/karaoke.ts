import { BaseClient, Command, Context } from '#common/index'

export default class Karaoke extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'karaoke',
      description: {
        content: 'on/off o filtro karaoke',
        examples: ['karaoke'],
        usage: 'karaoke',
      },
      category: 'filters',
      aliases: ['kk'],
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

    if (player.filters.includes('karaoke')) {
      player.player.setKaraoke()
      player.filters.splice(player.filters.indexOf('karaoke'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙠𝙖𝙧𝙖𝙤𝙠𝙚 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙙𝙤.',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setKaraoke({
        level: 1,
        monoLevel: 1,
        filterBand: 220,
        filterWidth: 100,
      })
      player.filters.push('karaoke')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙁𝙞𝙡𝙩𝙧𝙤 𝙠𝙖𝙧𝙖𝙤𝙠𝙚 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

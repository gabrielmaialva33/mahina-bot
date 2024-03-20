import { Command, Context, Mahina } from '#common/index'

export default class BassBoost extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'bassboost',
      description: {
        content: 'on/off o filtro bassboost',
        examples: ['bassboost'],
        usage: 'bassboost',
      },
      category: 'filters',
      aliases: ['bb'],
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
    })
  }

  async run(client: Mahina, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    if (player.filters.includes('bassboost')) {
      player.player.setEqualizer([])
      player.filters.splice(player.filters.indexOf('bassboost'), 1)
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝘽𝙖𝙨𝙨𝙗𝙤𝙤𝙨𝙩 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤.',
            color: client.color.main,
          },
        ],
      })
    } else {
      player.player.setEqualizer([
        { band: 0, gain: 0.34 },
        { band: 1, gain: 0.34 },
        { band: 2, gain: 0.34 },
        { band: 3, gain: 0.34 },
      ])
      player.filters.push('bassboost')
      ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝘽𝙖𝙨𝙨𝙗𝙤𝙤𝙨𝙩 𝙛𝙤𝙞 𝙖𝙩𝙞𝙫𝙖𝙙𝙤',
            color: client.color.main,
          },
        ],
      })
    }
  }
}

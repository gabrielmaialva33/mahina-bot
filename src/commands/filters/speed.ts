import { ApplicationCommandOptionType } from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'

export default class Speed extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'speed',
      description: {
        content: 'Define a velocidade da música',
        examples: ['speed 1.5'],
        usage: 'speed <number>',
      },
      category: 'filters',
      aliases: ['speed'],
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'speed',
          description: 'A velocidade da música',
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)
    const speed = Number(args[0])

    if (Number.isNaN(speed))
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙈𝙚 𝙙𝙚̂ 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤',
            color: client.color.red,
          },
        ],
      })

    if (speed < 0.5 || speed > 5)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙋𝙤𝙧 𝙛𝙖𝙫𝙤𝙧, 𝙘𝙤𝙡𝙤𝙦𝙪𝙚 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙚𝙣𝙩𝙧𝙚 0.5 𝙚 5',
            color: client.color.red,
          },
        ],
      })

    player.player.setTimescale({ speed: speed })

    return await ctx.sendMessage({
      embeds: [
        {
          description: `𝙊 𝙛𝙞𝙡𝙩𝙧𝙤 𝙙𝙚 𝙫𝙚𝙡𝙤𝙘𝙞𝙙𝙖𝙙𝙚 𝙚́ 𝙙𝙚 ${speed}`,
          color: client.color.main,
        },
      ],
    })
  }
}

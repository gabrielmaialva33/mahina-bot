import { ApplicationCommandOptionType } from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'

export default class Pitch extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'pitch',
      description: {
        content: 'on/off o filtro de pitch',
        examples: ['pitch 1'],
        usage: 'pitch <number>',
      },
      category: 'filters',
      aliases: ['ph'],
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
          name: 'number',
          description: 'O número para o qual você deseja definir o tom',
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)

    const number = Number(args[0])
    if (Number.isNaN(number))
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝘾𝙤𝙡𝙤𝙦𝙪𝙚 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤.',
            color: client.color.red,
          },
        ],
      })
    if (number > 5 || number < 1)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝘾𝙤𝙡𝙤𝙦𝙪𝙚 𝙪𝙢 𝙣𝙪́𝙢𝙚𝙧𝙤 𝙚𝙣𝙩𝙧𝙚 1 𝙚 5',
            color: client.color.red,
          },
        ],
      })
    player.player.setTimescale({ pitch: number, rate: 1, speed: 1 })

    return await ctx.sendMessage({
      embeds: [
        {
          description: `𝙋𝙞𝙩𝙘𝙝 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙤 𝙥𝙖𝙧𝙖 ${number}`,
          color: client.color.main,
        },
      ],
    })
  }
}

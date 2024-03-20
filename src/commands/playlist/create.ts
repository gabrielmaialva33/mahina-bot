import { ApplicationCommandOptionType } from 'discord.js'

import { Command, Context, Mahina } from '#common/index'

export default class Create extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'create',
      description: {
        content: 'Cria uma playlist',
        examples: ['create <name>'],
        usage: 'create <name>',
      },
      category: 'playlist',
      aliases: ['create'],
      cooldown: 3,
      args: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'name',
          description: 'O nome da playlist',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }
  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const name = args.join(' ').replace(/\s/g, '')
    if (name.length > 50)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙊 𝙣𝙤𝙢𝙚 𝙙𝙖 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙩𝙚𝙧 𝙢𝙖𝙞𝙨 𝙙𝙚 50 𝙘𝙖𝙧𝙖𝙘𝙩𝙚𝙧𝙚𝙨',
            color: client.color.red,
          },
        ],
      })
    const playlist = await client.db.getPlaylist(ctx.author!.id, name)
    if (playlist)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝙅𝙖́ 𝙚𝙭𝙞𝙨𝙩𝙚 𝙪𝙢𝙖 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙘𝙤𝙢 𝙚𝙨𝙨𝙚 𝙣𝙤𝙢𝙚',
            color: client.color.main,
          },
        ],
      })
    await client.db.createPlaylist(ctx.author!.id, name)
    return await ctx.sendMessage({
      embeds: [
        {
          description: `𝙋𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙘𝙤𝙢 𝙤 𝙣𝙤𝙢𝙚 ${name} 𝙘𝙧𝙞𝙖𝙙𝙖 𝙘𝙤𝙢 𝙨𝙪𝙘𝙚𝙨𝙨𝙤`,
          color: client.color.main,
        },
      ],
    })
  }
}

import { ApplicationCommandOptionType } from 'discord.js'

import { Command, Context, BaseClient } from '#common/index'

export default class Delete extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'delete',
      description: {
        content: 'Deleta uma playlist',
        examples: ['delete <playlist name>'],
        usage: 'delete <playlist name>',
      },
      category: 'playlist',
      aliases: ['delete'],
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
          name: 'playlist',
          description: 'O nome da playlist',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }
  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const playlist = args.join(' ').replace(/\s/g, '')

    const playlistExists = client.db.getPlaylist(ctx.author!.id, playlist)
    if (!playlistExists)
      return await ctx.sendMessage({
        embeds: [
          {
            description: '𝘼 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙣𝙖̃𝙤 𝙚𝙭𝙞𝙨𝙩𝙚',
            color: client.color.red,
          },
        ],
      })
    await client.db.deletePlaylist(ctx.author!.id, playlist)
    return await ctx.sendMessage({
      embeds: [
        {
          description: `𝙋𝙡𝙖𝙮𝙡𝙞𝙨𝙩 \`${playlist}\` 𝙙𝙚𝙡𝙚𝙩𝙖𝙙𝙖`,
          color: client.color.main,
        },
      ],
    })
  }
}

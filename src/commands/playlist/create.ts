import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class CreatePlaylist extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'create',
      description: {
        content: 'cmd.create.description',
        examples: ['create <name>'],
        usage: 'create <name>',
      },
      category: 'playlist',
      aliases: ['cre'],
      cooldown: 3,
      args: true,
      vote: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'name',
          description: 'cmd.create.options.name',
          type: 3,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const name = args.join(' ').trim()
    const embed = this.client.embed()

    if (name.length > 50) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setDescription(ctx.locale('cmd.create.messages.name_too_long'))
            .setColor(this.client.color.red),
        ],
      })
    }

    const playlistExists = await client.db.getPlaylist(ctx.author?.id!, name)
    if (playlistExists) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setDescription(ctx.locale('cmd.create.messages.playlist_exists'))
            .setColor(this.client.color.red),
        ],
      })
    }

    await client.db.createPlaylist(ctx.author?.id!, name)
    return await ctx.sendMessage({
      embeds: [
        embed
          .setDescription(
            ctx.locale('cmd.create.messages.playlist_created', {
              name,
            })
          )
          .setColor(this.client.color.green),
      ],
    })
  }
}

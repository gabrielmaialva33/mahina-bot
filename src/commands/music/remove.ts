import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Remove extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'remove',
      description: {
        content: 'cmd.remove.description',
        examples: ['remove 1'],
        usage: 'remove <song number>',
      },
      category: 'music',
      aliases: ['rm'],
      cooldown: 3,
      args: true,
      vote: false,
      player: {
        voice: true,
        dj: true,
        active: true,
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
          name: 'song',
          description: 'cmd.remove.options.song',
          type: 4,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    const embed = this.client.embed()
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    if (player.queue.tracks.length === 0)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.remove.errors.no_songs')),
        ],
      })

    const songNumber = Number(args[0])
    if (Number.isNaN(songNumber) || songNumber <= 0 || songNumber > player.queue.tracks.length)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.remove.errors.invalid_number')),
        ],
      })

    player.queue.remove(songNumber - 1)
    return await ctx.sendMessage({
      embeds: [
        embed.setColor(this.client.color.main).setDescription(
          ctx.locale('cmd.remove.messages.removed', {
            songNumber,
          })
        ),
      ],
    })
  }
}

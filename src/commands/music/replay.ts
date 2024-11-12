import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Replay extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'replay',
      description: {
        content: 'cmd.replay.description',
        examples: ['replay'],
        usage: 'replay',
      },
      category: 'music',
      aliases: ['rp'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    const embed = this.client.embed()
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    if (!player.queue.current?.info.isSeekable) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.replay.errors.not_seekable')),
        ],
      })
    }

    player.seek(0)
    return await ctx.sendMessage({
      embeds: [
        embed
          .setColor(this.client.color.main)
          .setDescription(ctx.locale('cmd.replay.messages.replaying')),
      ],
    })
  }
}

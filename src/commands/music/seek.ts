import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Seek extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'seek',
      description: {
        content: 'cmd.seek.description',
        examples: ['seek 1m, seek 1h 30m', 'seek 1h 30m 30s'],
        usage: 'seek <duration>',
      },
      category: 'music',
      aliases: ['s'],
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'duration',
          description: 'cmd.seek.options.duration',
          type: 3,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    const current = player?.queue.current?.info
    const embed = this.client.embed()
    const duration = client.utils.parseTime(args.join(' '))
    if (!duration) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.seek.errors.invalid_format')),
        ],
      })
    }
    if (!current?.isSeekable || current.isStream) {
      return await ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.red)
            .setDescription(ctx.locale('cmd.seek.errors.not_seekable')),
        ],
      })
    }
    if (duration > current.duration) {
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription(
            ctx.locale('cmd.seek.errors.beyond_duration', {
              length: client.utils.formatTime(current.duration),
            })
          ),
        ],
      })
    }
    player?.seek(duration)
    return await ctx.sendMessage({
      embeds: [
        embed.setColor(this.client.color.main).setDescription(
          ctx.locale('cmd.seek.messages.seeked_to', {
            duration: client.utils.formatTime(duration),
          })
        ),
      ],
    })
  }
}

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { ensureStreamCommandReady } from '#common/stream_runtime'

export default class MPrevious extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mprevious',
      description: {
        content: 'cmd.mprevious.description',
        examples: ['mprevious'],
        usage: 'mprevious',
      },
      category: 'stream',
      aliases: ['mprev'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const queue = client.selfbot.getQueue(ctx.guild.id)
    if (!queue) {
      return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    }

    if (queue.previous.length === 0) {
      const embed = this.client
        .embed()
        .setColor(this.client.color.red)
        .setDescription(ctx.locale('cmd.mprevious.errors.no_previous'))

      return await ctx.sendMessage({ embeds: [embed] })
    }

    const prev = await client.selfbot.goBack(ctx.guild.id, ctx.member)
    if (!prev) {
      const embed = this.client
        .embed()
        .setColor(this.client.color.red)
        .setDescription(ctx.locale('cmd.mprevious.errors.unavailable'))

      return await ctx.sendMessage({ embeds: [embed] })
    }

    const embed = this.client
      .embed()
      .setColor(this.client.color.main)
      .setDescription(
        ctx.locale('cmd.mprevious.messages.playing', {
          title: prev.title,
          uri: prev.url || '',
        })
      )

    return await ctx.sendMessage({ embeds: [embed] })
  }
}

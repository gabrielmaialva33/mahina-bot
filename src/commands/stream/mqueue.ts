import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { ensureStreamCommandReady } from '#common/stream_runtime'

export default class MQueue extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mqueue',
      description: {
        content: 'cmd.mqueue.description',
        examples: ['mqueue'],
        usage: 'mqueue',
      },
      category: 'stream',
      aliases: ['mq'],
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

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const queue = client.selfbot.getQueue(ctx.guild.id)
    if (!queue?.current) {
      return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    }

    const current = queue.current
    const currentDuration = current.duration
      ? client.utils.formatTime(current.duration)
      : '🔴 AO VIVO'

    let description = ctx.locale('cmd.mqueue.now_playing', {
      title: current.title,
      uri: current.url || '',
      requester: current.requester.id,
      duration: currentDuration,
    })

    if (queue.tracks.length > 0) {
      description += '\n\n'
      const tracks = queue.tracks.slice(0, 10)
      description += tracks
        .map((track, index) => {
          const dur = track.duration ? client.utils.formatTime(track.duration) : '🔴 AO VIVO'
          return ctx.locale('cmd.mqueue.track_info', {
            index: String(index + 1),
            title: track.title,
            uri: track.url || '',
            requester: track.requester.id,
            duration: dur,
          })
        })
        .join('\n')

      if (queue.tracks.length > 10) {
        description += `\n\n... +${queue.tracks.length - 10} tracks`
      }
    }

    const loopLabel =
      queue.loopMode === 'off' ? '' : queue.loopMode === 'track' ? ' | 🔂 Track' : ' | 🔁 Queue'

    const embed = this.client
      .embed()
      .setColor(this.client.color.main)
      .setAuthor({ name: ctx.locale('cmd.mqueue.title') })
      .setDescription(description)
      .setFooter({
        text: `${queue.tracks.length} ${ctx.locale('cmd.mqueue.tracks_in_queue')}${loopLabel}`,
      })

    await ctx.sendMessage({ embeds: [embed] })
  }
}

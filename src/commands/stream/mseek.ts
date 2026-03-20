import { ApplicationCommandOptionType } from 'discord.js'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, requireStreamQueue } from '#common/stream_runtime'

export default class MSeek extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mseek',
      description: {
        content: 'cmd.mseek.description',
        examples: ['mseek 1:30:00', 'mseek 42:15', 'mseek 90'],
        usage: 'mseek <timestamp>',
      },
      category: 'stream',
      aliases: ['msk'],
      cooldown: 3,
      args: true,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'timestamp',
          description: 'cmd.mseek.options.timestamp',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const queue = await requireStreamQueue(client, ctx)
    if (!queue) return

    const track = queue.current!
    if (track.type !== 'local' && track.type !== 'url') {
      await ctx.sendMessage(ctx.locale('cmd.mseek.errors.not_seekable'))
      return
    }

    const timeStr = args[0]
    const seconds = this.parseTimestamp(timeStr)

    if (seconds === null || seconds < 0) {
      await ctx.sendMessage(ctx.locale('cmd.mseek.errors.invalid_format'))
      return
    }

    if (track.duration && seconds * 1000 > track.duration) {
      await ctx.sendMessage(ctx.locale('cmd.mseek.errors.exceeds_duration'))
      return
    }

    const success = await client.selfbot.seekTrack(ctx.guild.id, seconds, ctx.member)
    if (!success) {
      await ctx.sendMessage(ctx.locale('cmd.mseek.errors.seek_failed'))
      return
    }

    const formatted = this.formatTime(seconds)
    const embed = createStreamStatusEmbed(
      client,
      ctx,
      ctx.locale('cmd.mseek.messages.seeked', { time: formatted, title: track.title })
    )

    await ctx.sendMessage({ embeds: [embed] })
  }

  private parseTimestamp(input: string): number | null {
    if (!input) return null

    // Pure seconds: "90"
    if (/^\d+$/.test(input)) {
      return Number.parseInt(input, 10)
    }

    // MM:SS or HH:MM:SS
    const parts = input.split(':').map(Number)
    if (parts.some((p) => Number.isNaN(p) || p < 0)) return null

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }

    return null
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${m}:${String(s).padStart(2, '0')}`
  }
}

import fs from 'node:fs'
import path from 'node:path'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'
import type { StreamTrack } from '#common/stream_queue'
import { ApplicationCommandOptionType } from 'discord.js'

export default class MPlay extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mplay',
      description: {
        content: 'cmd.mplay.description',
        examples: ['mplay <movie name>', 'mplay Frozen', 'mplay Frozen 1'],
        usage: 'mplay',
      },
      category: 'stream',
      aliases: ['mp'],
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
          name: 'movie',
          description: 'cmd.mplay.options.movie',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'audio',
          description: 'cmd.mplay.options.audioTrack',
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return
    const downloadsFiles = fs.readdirSync(path.join(process.cwd(), 'downloads'))
    if (downloadsFiles.length === 0) {
      await ctx.sendMessage(ctx.locale('cmd.mlist.messages.no_movies'))
      return
    }

    const videos = downloadsFiles
      .map((file) => {
        const fileName = path.parse(file).name
        return {
          name: fileName,
          path: path.join(process.cwd(), 'downloads', file),
        }
      })
      .filter((movie) => movie !== undefined && movie.name !== '.gitkeep')

    const movieName = args.shift()
    if (!movieName) {
      await ctx.sendMessage(ctx.locale('cmd.mplay.errors.missing_movie'))
      return
    }

    const movie = videos.find((m) => m!.name === movieName)
    if (!movie) {
      await ctx.sendMessage(ctx.locale('cmd.mplay.errors.movie_not_found'))
      return
    }

    await ctx.sendMessage(ctx.locale('cmd.mplay.messages.waiting'))

    const track: StreamTrack = {
      type: 'local',
      source: movie.path,
      title: movieName,
      requester: { id: ctx.author.id, username: ctx.author.username },
      deleteAfterPlay: false,
    }

    const position = await client.selfbot.enqueue(ctx.guild.id, ctx.member, track, ctx.channel!.id)

    if (position === 0) {
      const embed = createStreamStatusEmbed(
        client,
        ctx,
        ctx.locale('cmd.mplay.messages.playing_movie', { movie: movieName })
      )

      await ctx.editMessage({ content: '', embeds: [embed] })
    } else {
      const embed = createStreamStatusEmbed(
        client,
        ctx,
        ctx.locale('cmd.mplay.messages.queued_title'),
        ctx.locale('cmd.vplay.added_to_queue', {
          title: movieName,
          uri: '',
          position: String(position),
        })
      )

      await ctx.editMessage({ content: '', embeds: [embed] })
    }
  }
}

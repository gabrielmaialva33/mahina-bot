import fs from 'node:fs'
import path from 'node:path'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

import { T } from '#common/i18n'

export default class MPlay extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mplay',
      description: {
        content: 'cmd.mplay.description',
        examples: ['mplay <movie name>', 'mplay Frozen'],
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
          type: 1,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    const locale = await client.db.getLanguage(ctx.guild.id)

    const downloadsFiles = fs.readdirSync(path.join(process.cwd(), 'downloads'))
    if (downloadsFiles.length === 0) await ctx.sendMessage('cmd.mlist.messages.no_movies')

    let videos = downloadsFiles
      .map((file) => {
        const fileName = path.parse(file).name
        return {
          name: fileName,
          path: path.join(process.cwd(), 'downloads', file),
        }
      })
      .filter((movie) => movie !== undefined)

    videos = videos.filter((movie) => movie!.name !== '.gitkeep')

    let movieName = args.shift()
    let movie = videos.find((m) => m!.name === movieName)
    if (!movie) {
      await ctx.sendMessage(T(locale, 'cmd.mplay.errors.movie_not_found'))
      return
    }

    await ctx.sendMessage(T(locale, 'cmd.mplay.messages.waiting'))

    const embed = this.client
      .embed()
      .setColor(client.color.main)
      .setTitle(T(locale, 'cmd.mplay.messages.playing_movie', { movie: movieName }))
      .setFooter({
        text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
        iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
      })
      .setTimestamp()

    await ctx.editMessage({ content: '', embeds: [embed] })

    await client.selfbot.play(ctx.guild.id, ctx.member, movie!.path, movieName)
  }
}

import fs from 'node:fs'
import path from 'node:path'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'

export default class MList extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mlist',
      description: {
        content: 'cmd.mlist.description',
        examples: ['mlist'],
        usage: 'mlist',
      },
      category: 'stream',
      aliases: ['ml'],
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
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context, _args: string[]): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const downloadsFiles = fs.readdirSync(path.join(process.cwd(), 'downloads'))
    if (downloadsFiles.length === 0) {
      await ctx.sendMessage(ctx.locale('cmd.mlist.messages.no_movies'))
      return
    }

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

    if (videos.length === 0) {
      await ctx.sendMessage(ctx.locale('cmd.mlist.messages.no_movies'))
      return
    }

    const embed = createStreamStatusEmbed(
      client,
      ctx,
      ctx.locale('cmd.mlist.messages.available_movies'),
      videos.map((video) => `- ${video!.name}`).join('\n')
    )

    await ctx.sendMessage({ embeds: [embed] })
  }
}

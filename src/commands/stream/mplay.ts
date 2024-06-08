import path from 'node:path'

import { BaseClient, Command, Context } from '#common/index'
import fs from 'node:fs'

export default class MPlay extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mplay',
      description: {
        content: 'Stream de filme no canal de voz.',
        examples: ['mplay <nome do filme>', 'mplay Frozen'],
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
        dj_perm: null,
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
          description: 'O nome do filme que você quer assistir',
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return

    if (this.client.selfClient.streamStatus.joined)
      return ctx.sendMessage('𝙊 𝙗𝙤𝙩 𝙟𝙖́ 𝙚𝙨𝙩𝙖́ 𝙚𝙢 𝙪𝙢 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙫𝙤𝙯.')

    const movieFiles = fs.readdirSync(client.movieFolder)
    if (movieFiles.length === 0) return ctx.sendMessage('𝙉𝙖̃𝙤 𝙝𝙖́ 𝙛𝙞𝙡𝙢𝙚𝙨 𝙥𝙖𝙧𝙖 𝙖𝙨𝙨𝙞𝙨𝙩𝙞𝙧.')
    let movies = movieFiles
      .map((file) => {
        if (file.endsWith('.mp4') || file.endsWith('.mkv')) {
          const fileName = path.parse(file).name
          return {
            name: fileName,
            path: path.join(client.movieFolder, file),
          }
        }
      })
      .filter((movie) => movie !== undefined)

    let movieName = args.shift()
    let movie = movies.find((m) => m!.name === movieName)

    await this.client.selfClient.playVideo(ctx.member, ctx.guild.id, movie!.path, movieName)

    await ctx.sendMessage(`𝙊 𝙛𝙞𝙡𝙢 𝙚𝙨𝙩𝙖́ 𝙥𝙧𝙤𝙣𝙩𝙤. 𝙋𝙤𝙙𝙚 𝙖𝙥𝙚𝙧𝙩𝙖 𝙥𝙖𝙧𝙖 𝙖𝙨𝙨𝙞𝙨𝙩𝙞𝙧 𝙖 𝙛𝙞𝙡𝙢𝙚: ${movieName}`)
  }
}

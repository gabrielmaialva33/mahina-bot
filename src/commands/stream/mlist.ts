import fs from 'node:fs'
import path from 'node:path'

import { BaseClient, Command, Context } from '#common/index'

export default class MList extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mlist',
      description: {
        content: 'Lista de filmes disponíveis para assistir.',
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
        dj_perm: null,
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

  async run(client: BaseClient, ctx: Context): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return

    const movieFiles = fs.readdirSync(client.movieFolder)
    if (movieFiles.length === 0) return ctx.sendMessage('𝙉𝙖̃𝙤 𝙝𝙖́ 𝙛𝙞𝙡𝙢𝙚𝙨 𝙥𝙖𝙧𝙖 𝙖𝙨𝙨𝙞𝙨𝙩𝙞𝙧.')

    let movies = movieFiles.map((file) => {
      const fileName = path.parse(file).name
      // replace space with _
      return {
        name: fileName.replace(/ /g, ''),
        path: path.join(client.movieFolder, file),
      }
    })

    return ctx.sendMessage(`𝙁𝙞𝙡𝙢𝙚𝙨 𝙙𝙞𝙨𝙥𝙤𝙣𝙞́𝙫𝙚𝙞𝙨:\n${movies.map((m) => m.name).join('\n')}`)
  }
}

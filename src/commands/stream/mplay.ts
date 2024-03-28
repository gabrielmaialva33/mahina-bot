import path from 'node:path'

import { BaseClient, Command, Context } from '#common/index'

export default class MPlay extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mplay',
      description: {
        content: 'Stream de filme no canal de voz.',
        examples: ['mplay'],
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
      options: [],
    })
  }

  async run(_client: BaseClient, ctx: Context, _args: string[]): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return

    const tmpFolder = process.cwd() + '/tmp'
    const movieFile = path.join(tmpFolder, 'movie.mp4')

    // message.member && message.member.voice.channelId && message.guildId
    await this.client.selfClient.moviePlay(ctx.member, ctx.guild.id, movieFile)
    await ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢 𝙚𝙨𝙩𝙖́ 𝙥𝙧𝙤𝙣𝙩𝙤.')
  }
}

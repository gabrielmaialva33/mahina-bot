import { BaseClient, Command, Context } from '#common/index'
import ytdl from 'ytdl-core'

export default class VPlay extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'vplay',
      description: {
        content: 'Stream de vídeo no canal de voz.',
        examples: [
          'vplay https://www.youtube.com/watch?v=A7blkCcowvk',
          'vplay https://www.twitch.tv/monstercat',
        ],
        usage: 'vplay <url>',
      },
      category: 'stream',
      aliases: ['vp'],
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
          name: 'url',
          description: 'O link do vídeo que você quer assistir',
          type: 3,
          required: true,
          autocomplete: false,
        },
      ],
    })
  }

  async run(_client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const query = args.join(' ')
    if (!ctx.guild) return
    if (!ctx.member) return

    // check query if it's a valid url
    const validUrl = ytdl.validateURL(query)
    console.log(`validUrl`, validUrl)
    if (!validUrl) return ctx.sendMessage('𝙊 𝙡𝙞𝙣𝙠 𝙣𝙖̃𝙤 𝙚́ 𝙫𝙖́𝙡𝙞𝙙𝙤.')

    // message.member && message.member.voice.channelId && message.guildId
    await this.client.selfClient.playYtVideo(ctx.member, ctx.guild.id, query)

    return ctx.sendMessage('𝙑𝙞́𝙙𝙚𝙤 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙖𝙙𝙤.')
  }
}

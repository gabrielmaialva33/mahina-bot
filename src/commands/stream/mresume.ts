import { BaseClient, Command, Context } from '#common/index'

export default class MResume extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mresume',
      description: {
        content: 'Continuar o filme que está sendo transmitido.',
        examples: ['mresume'],
        usage: 'mresume',
      },
      category: 'stream',
      aliases: ['mr'],
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
    })
  }

  async run(_client: BaseClient, ctx: Context, _args: string[]): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return

    if (this.client.selfClient.streamStatus.playing)
      return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙟𝙖́ 𝙚𝙨𝙩𝙖́ 𝙖𝙘𝙩𝙞𝙫𝙤.')

    this.client.selfClient.streamer.resumeStream()

    this.client.selfClient.streamStatus.playing = true

    return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙛𝙤𝙞 𝙖𝙘𝙩𝙞𝙫𝙤.')
  }
}

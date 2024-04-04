import { BaseClient, Command, Context } from '#common/index'

export default class MPause extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mpause',
      description: {
        content: 'Pausar o filme que está sendo transmitido.',
        examples: ['mpause'],
        usage: 'mpause',
      },
      category: 'stream',
      aliases: ['mp'],
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

    if (!this.client.selfClient.streamStatus.playing)
      return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙟𝙖́ 𝙚𝙨𝙩𝙖́ 𝙥𝙖𝙪𝙨𝙖𝙙𝙤.')

    this.client.selfClient.streamer.pauseStream()

    this.client.selfClient.streamStatus.playing = false

    return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙛𝙤𝙞 𝙥𝙖𝙪𝙨𝙖𝙙𝙤.')
  }
}

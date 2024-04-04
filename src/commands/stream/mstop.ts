import { BaseClient, Command, Context } from '#common/index'

export default class MStop extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'mstop',
      description: {
        content: 'Parar o filme que está sendo transmitido.',
        examples: ['mstop'],
        usage: 'mstop',
      },
      category: 'stream',
      aliases: ['ms'],
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

    if (!this.client.selfClient.streamStatus.joined)
      return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙟𝙖́ 𝙛𝙤𝙞 𝙥𝙖𝙧𝙖𝙙𝙤.')

    this.client.selfClient.streamer.leaveVoice()

    this.client.selfClient.streamStatus.joined = false
    this.client.selfClient.streamStatus.joinsucc = false
    this.client.selfClient.streamStatus.playing = false
    this.client.selfClient.streamStatus.channelInfo = {
      guildId: '',
      channelId: '',
      cmdChannelId: this.client.selfClient.streamStatus.channelInfo.cmdChannelId,
    }

    return ctx.sendMessage('𝙊 𝙛𝙞𝙡𝙢𝙚 𝙛𝙤𝙞 𝙥𝙖𝙧𝙖𝙙𝙤.')
  }
}

import { Client, StageChannel } from 'discord.js-selfbot-v13'
import { NewApi, Streamer, Utils } from '@gabrielmaialva33/discord-video-stream'
import type MahinaBot from '#common/mahina_bot'

let current: ReturnType<typeof NewApi.prepareStream>['command']

export default class SelfBot extends Client {
  streamer: Streamer
  mahinaBot: MahinaBot

  constructor(mahinaBot1: MahinaBot) {
    super({
      allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    })
    this.streamer = new Streamer(this)
    this.mahinaBot = mahinaBot1
  }

  async start(token: string): Promise<void> {
    this.streamer.client.on('ready', async (client) => {
      this.mahinaBot.logger.info(`${client.user.username} is ready`)
      this.updateStatus('🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷')
    })

    await this.streamer.client.login(token).catch(console.error)
  }

  async play(guildId: string, member: any, link: string, movieName: string = '') {
    await this.streamer.joinVoice(guildId, member.voice.channelId)

    const channel = member.voice.channel
    if (channel instanceof StageChannel) {
      await this.streamer.client.user!.voice!.setSuppressed(false)
    }
    this.updateStatus(`🎥 ${movieName} 🍷`)

    const { command, output } = NewApi.prepareStream(link, {
      width: 1280,
      height: 720,
      frameRate: 30,
      videoCodec: Utils.normalizeVideoCodec('H264'),
    })

    current = command

    await NewApi.playStream(output, this.streamer).catch(() => current?.kill('SIGTERM'))
  }

  private updateStatus(status: string): void {
    if (this.streamer.client.user) {
      console.log('status', status)
      this.streamer.client.user.setActivity({
        name: status,
        type: 'WATCHING',
        state: '🎥 🍷',
      })
    }
  }
}

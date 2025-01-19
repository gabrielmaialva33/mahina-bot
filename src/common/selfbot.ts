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

  /**
   * @param guildId  The guild ID where the user is streaming.
   * @param member   The guild member initiating the stream.
   * @param link     The file path or URL of the video.
   * @param movieName  (Optional) Name of the movie being streamed.
   * @param audioTrack  (Optional) Numeric index of the desired audio track (e.g., 0 or 1).
   */
  async play(
    guildId: string,
    member: any,
    link: string,
    movieName: string = 'no name',
    audioTrack?: number
  ) {
    this.streamer.leaveVoice()
    this.streamer.stopStream()

    // Join the specified voice channel
    await this.streamer.joinVoice(guildId, member.voice.channelId)

    const channel = member.voice.channel
    if (channel instanceof StageChannel) {
      await this.streamer.client.user!.voice!.setSuppressed(false)
    }
    this.updateStatus(`🎥 ${movieName} 🍷`)

    // Prepare the FFmpeg command
    const { command, output } = NewApi.prepareStream(link, {
      width: 1280,
      height: 720,
      frameRate: 30,
      videoCodec: Utils.normalizeVideoCodec('H264'),
    })

    // If user provides an audio track index, map the first video track and the specified audio track.
    // The default is often 0 for the first audio, 1 for the second audio, and so on.
    if (typeof audioTrack === 'number') {
      command.addOutputOption('-map', '0:v:0') // Map video track 0
      command.addOutputOption('-map', `0:a:${audioTrack}`) // Map the chosen audio track
    }

    current = command

    // Play the stream (this method handles demuxing and streaming to Discord)
    await NewApi.playStream(output, this.streamer).catch(() => current?.kill('SIGTERM'))

    // Optionally, leave the voice channel once playback is done
    this.streamer.leaveVoice()

    // Reset status
    this.updateStatus('🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷')
  }

  pauseStream(): void {
    if (current) {
      current.kill('SIGSTOP')
    }
  }

  resumeStream(): void {
    if (current) {
      current.kill('SIGCONT')
    }
  }

  private updateStatus(status: string): void {
    if (this.streamer.client.user) {
      this.streamer.client.user.setActivity({
        name: status,
        type: 'WATCHING',
        state: '🎥 🍷',
      })
    }
  }
}

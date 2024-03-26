import { Client, StageChannel } from 'discord.js-selfbot-v13'
import {
  command,
  getInputMetadata,
  inputHasAudio,
  MediaUdp,
  setStreamOpts,
  Streamer,
  streamLivestreamVideo,
} from '@dank074/discord-video-stream'

setStreamOpts({
  width: 1920,
  height: 1080,
  fps: 30,
  bitrateKbps: 8000,
  maxBitrateKbps: 2500,
  hardware_acceleration: true,
  video_codec: 'H264',
})

export class SelfClient extends Client {
  streamer: Streamer

  constructor() {
    super()
    this.streamer = new Streamer(this)
  }

  async start(token: string): Promise<void> {
    await this.streamer.client.login(token)

    this.on('messageCreate', async (message) => {
      if (message.content.startsWith('!vplay')) {
        const args = message.content.split(' ')
        args.shift()
        console.log({ args })

        if (message.member && message.member.voice.channelId && message.guildId) {
          await this.streamer.joinVoice(message.guildId, message.member.voice.channelId)
          const channel = message.member.voice.channel

          if (channel instanceof StageChannel) {
            await this.streamer.client.user!.voice!.setSuppressed(false)
          }

          const streamLinkUdpConn = await this.streamer.createStream()

          await this.playVideo(
            'https://cdn.discordapp.com/attachments/1219766706696884245/1222140197366399107/Space_Song_A7blkCcowvk.mp4?ex=661521c1&is=6602acc1&hm=d971e767ad3fbf24d35e2b332296e096a066bde004f759a3e647cb20ecee91cb&',
            streamLinkUdpConn
          )
        } else {
          console.log('No voice channel')
        }
      }
    })
  }

  async playVideo(video: string, udpConn: MediaUdp) {
    let includeAudio = true

    try {
      const metadata = await getInputMetadata(video)
      console.log(JSON.stringify(metadata.streams))
      includeAudio = inputHasAudio(metadata)
    } catch (e) {
      console.log(e)
      return
    }

    console.log('Started playing video')

    udpConn.mediaConnection.setSpeaking(true)
    udpConn.mediaConnection.setVideoStatus(true)
    try {
      const res = await streamLivestreamVideo(video, udpConn, includeAudio)

      console.log('Finished playing video ' + res)
    } catch (e) {
      console.log(e)
    } finally {
      udpConn.mediaConnection.setSpeaking(false)
      udpConn.mediaConnection.setVideoStatus(false)
    }
    command?.kill('SIGINT')
  }
}

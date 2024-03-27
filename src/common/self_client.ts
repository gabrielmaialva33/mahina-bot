import { Client, CustomStatus, StageChannel, ActivityOptions } from 'discord.js-selfbot-v13'
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
  // width: 1920,
  // height: 1080,
  width: 1080,
  height: 720,
  fps: 30,
  bitrateKbps: 8000,
  maxBitrateKbps: 2500,
  hardware_acceleration: false,
  video_codec: 'H264',
})

export class SelfClient extends Client {
  streamer: Streamer

  status_idle = () => new CustomStatus().setState(`𝘼𝙨𝙨𝙞𝙨𝙩𝙞𝙣𝙙𝙤 𝙖𝙡𝙜𝙤`).setEmoji('🎥')
  status_watch = (name: string) => new CustomStatus().setState(`𝙑𝙞𝙚𝙣𝙙𝙤 𝙖 ${name}`).setEmoji('🎥')

  constructor() {
    super()
    this.streamer = new Streamer(this)
  }

  async start(token: string): Promise<void> {
    await this.streamer.client.login(token)
    this.streamer.client.user!.setActivity(this.status_idle() as unknown as ActivityOptions)

    let streamStatus = {
      joined: false,
      joinsucc: false,
      playing: false,
      channelInfo: { guildId: '', channelId: '', cmdChannelId: '' },
      starttime: '00:00:00',
      timemark: '',
    }

    this.streamer.client.on('voiceStateUpdate', (oldState, newState) => {
      // when exit channel
      if (oldState.member?.user.id === this.streamer.client.user?.id) {
        if (oldState.channelId && !newState.channelId) {
          streamStatus.joined = false
          streamStatus.joinsucc = false
          streamStatus.playing = false
          streamStatus.channelInfo = {
            guildId: '',
            channelId: '',
            cmdChannelId: streamStatus.channelInfo.cmdChannelId,
          }
          this.streamer.client.user?.setActivity(this.status_idle() as unknown as ActivityOptions)
        }
      }

      // when join channel success
      if (newState.member?.user.id === this.streamer.client.user?.id) {
        if (newState.channelId && !oldState.channelId) {
          streamStatus.joined = true

          if (
            newState.guild.id === streamStatus.channelInfo.guildId &&
            newState.channelId === streamStatus.channelInfo.channelId
          )
            streamStatus.joinsucc = true
        }
      }
    })

    this.on('messageCreate', async (message) => {
      if (message.author.bot) return // ignore bots
      if (message.author.id === this.streamer.client.user?.id) return // ignore self
      if (!message.content.startsWith('!')) return // ignore non-commands

      if (message.content.startsWith('!viplay')) {
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

          const tmpFolder = process.cwd() + '/tmp'
          console.log({ tmpFolder })
          const moviePath = tmpFolder + '/movie.mp4'
          console.log({ moviePath })

          await this.playVideo(moviePath, streamLinkUdpConn)
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

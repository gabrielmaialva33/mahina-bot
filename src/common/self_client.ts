import { ActivityOptions, Client, CustomStatus, StageChannel } from 'discord.js-selfbot-v13'
import {
  command,
  getInputMetadata,
  inputHasAudio,
  MediaUdp,
  setStreamOpts,
  Streamer,
  streamLivestreamVideo,
} from '@dank074/discord-video-stream'

import ytdl from 'ytdl-core'
import * as readline from 'node:readline'
import cp from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

import { BaseClient } from '#common/base_client'

setStreamOpts({
  // width: 1920,
  // height: 1080,
  width: 1280,
  height: 720,
  fps: 30,
  bitrateKbps: 4000,
  maxBitrateKbps: 2500,
  hardware_acceleration: false,
  video_codec: 'H264',
})

export class SelfClient extends Client {
  streamer: Streamer
  baseClient: BaseClient

  constructor(baseClient: BaseClient) {
    super()

    this.streamer = new Streamer(this)
    this.baseClient = baseClient
  }

  status_idle = () => new CustomStatus().setState(`𝘼𝙨𝙨𝙞𝙨𝙩𝙞𝙣𝙙𝙤 𝙖𝙡𝙜𝙤`).setEmoji('🎥')

  status_watch = (name: string) => new CustomStatus().setState(`𝙑𝙞𝙚𝙣𝙙𝙤 𝙖 ${name}`).setEmoji('🎥')

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
  }

  async moviePlay(member: any, guildId: string, link: string) {
    await this.streamer.joinVoice(guildId, member.voice.channelId)
    const channel = member.voice.channel

    if (channel instanceof StageChannel)
      await this.streamer.client.user!.voice!.setSuppressed(false)

    const streamLinkUdpConn = await this.streamer.createStream()

    this.playVideo(link, streamLinkUdpConn)
    this.streamer.client.user?.setActivity(this.status_watch('') as unknown as ActivityOptions)
  }

  async playVideo(video: string, udpConn: MediaUdp) {
    let includeAudio = true

    try {
      const metadata = await getInputMetadata(video)
      console.log(JSON.stringify(metadata.streams))
      includeAudio = inputHasAudio(metadata)
    } catch (e) {
      this.baseClient.logger.error(e)
      return
    }

    this.baseClient.logger.info(`Starting video stream`)

    udpConn.mediaConnection.setSpeaking(true)
    udpConn.mediaConnection.setVideoStatus(true)

    try {
      const res = await streamLivestreamVideo(video, udpConn, includeAudio)
      this.baseClient.logger.info(`Playing video: ${res}`)
    } catch (e) {
      this.baseClient.logger.error(`Error playing video: ${e}`)
    } finally {
      udpConn.mediaConnection.setSpeaking(false)
      udpConn.mediaConnection.setVideoStatus(false)
    }

    command?.kill('SIGINT')
  }

  async getVideoUrl(videoUrl: string) {
    const tracker = {
      start: Date.now(),
      audio: { downloaded: 0, total: Number.POSITIVE_INFINITY },
      video: { downloaded: 0, total: Number.POSITIVE_INFINITY },
      merged: { frame: 0, speed: '0x', fps: 0 },
    }

    // get audio and video streams
    const audio = ytdl(videoUrl, { quality: 'highestaudio' }).on(
      'progress',
      (_, downloaded, total) => (tracker.audio = { downloaded, total })
    )
    const video = ytdl(videoUrl, { quality: 'highestvideo' }).on(
      'progress',
      (_, downloaded, total) => (tracker.video = { downloaded, total })
    )

    let progressbarHandle: string | number | NodeJS.Timeout | null | undefined = null
    const progressbarInterval = 1000
    const showProgress = () => {
      readline.cursorTo(process.stdout, 0)
      const toMB = (i: number) => (i / 1024 / 1024).toFixed(2)

      process.stdout.write(
        `Audio  | ${((tracker.audio.downloaded / tracker.audio.total) * 100).toFixed(2)}% processed `
      )
      process.stdout.write(
        `(${toMB(tracker.audio.downloaded)}MB of ${toMB(tracker.audio.total)}MB).${' '.repeat(10)}\n`
      )

      process.stdout.write(
        `Video  | ${((tracker.video.downloaded / tracker.video.total) * 100).toFixed(2)}% processed `
      )
      process.stdout.write(
        `(${toMB(tracker.video.downloaded)}MB of ${toMB(tracker.video.total)}MB).${' '.repeat(10)}\n`
      )

      process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `)
      process.stdout.write(
        `(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`
      )

      process.stdout.write(
        `running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(2)} Minutes.`
      )
      readline.moveCursor(process.stdout, 0, -3)

      // send progress to discord
    }

    const ffmpegProcess = cp.spawn(
      ffmpeg as any,
      [
        // Remove ffmpeg's console spamming
        '-loglevel',
        '8',
        '-hide_banner',
        // Redirect/Enable progress messages
        '-progress',
        'pipe:3',
        // Set inputs
        '-i',
        'pipe:4',
        '-i',
        'pipe:5',
        // Map audio & video from streams
        '-map',
        '0:a',
        '-map',
        '1:v',
        // Keep encoding
        '-c:v',
        'copy',
        // Define output file
        './tmp/out.mkv',
      ],
      {
        windowsHide: true,
        stdio: [
          /* Standard: stdin, stdout, stderr */
          'inherit',
          'inherit',
          'inherit',
          /* Custom: pipe:3, pipe:4, pipe:5 */
          'pipe',
          'pipe',
          'pipe',
        ],
      }
    )

    ffmpegProcess.on('close', () => {
      console.log('done')
      // Cleanup
      process.stdout.write('\n\n\n\n')
      // @ts-ignore
      clearInterval(progressbarHandle)
    })

    // Link streams
    // FFmpeg creates the transformer streams and we just have to insert / read data
    ffmpegProcess.stdio[3]!.on('data', (chunk: { toString: () => string }) => {
      // Start the progress bar
      if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressbarInterval)
      // Parse the param=value list returned by ffmpeg
      const lines = chunk.toString().trim().split('\n')
      const args = {}
      for (const l of lines) {
        const [key, value] = l.split('=')
        // @ts-ignore
        args[key.trim()] = value.trim()
      }
      // @ts-ignore
      tracker.merged = args
    })

    audio.pipe(ffmpegProcess.stdio[4 as any] as any)
    video.pipe(ffmpegProcess.stdio[5 as any] as any)

    return process.cwd() + '/tmp/out.mkv'

    // const videoDetails = video.videoDetails
    // if (videoDetails.isLiveContent) {
    //   // check if the video url is livestream
    //   const tsFormats = video.formats.filter((format) => format.container === 'ts')
    //   const highestTsFormat = tsFormats.reduce((prev: any, current: any) => {
    //     if (!prev || current.bitrate > prev.bitrate) return current
    //
    //     return prev
    //   })
    //
    //   if (highestTsFormat) return highestTsFormat.url
    // } else {
    //   const videoFormats = video.formats
    //     .filter((format: { hasVideo: any; hasAudio: any }) => format.hasVideo && format.hasAudio)
    //     .filter((format) => format.container === 'mp4')
    //
    //   console.log({ videoFormats })
    //
    //   return f.url
    // }
  }

  async playYtVideo(member: any, guildId: string, link: string) {
    await this.streamer.joinVoice(guildId, member.voice.channelId)
    const channel = member.voice.channel

    if (channel instanceof StageChannel)
      await this.streamer.client.user!.voice!.setSuppressed(false)

    const streamLinkUdpConn = await this.streamer.createStream()

    let yturl = await this.getVideoUrl(link).catch((error) => console.error('Error:', error))
    if (yturl) {
      this.playVideo(yturl, streamLinkUdpConn)
      this.streamer.client.user?.setActivity(this.status_watch('') as unknown as ActivityOptions)
    }
  }
}

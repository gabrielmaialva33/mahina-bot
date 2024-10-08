import * as readline from 'node:readline'
import cp from 'node:child_process'
import path from 'node:path'

import { ActivityOptions, Client, CustomStatus, StageChannel } from 'discord.js-selfbot-v13'

import {
  command,
  MediaUdp,
  Streamer,
  streamLivestreamVideo,
} from '@gabrielmaialva33/discord-video-stream'

import ytdl from 'ytdl-core'
import ffmpeg from 'ffmpeg-static'

import { BaseClient } from '#common/base_client'

// 3840x2160 (4k)
// 2560x1440 (2k)
// 1920x1080 (1080p)
// 1280x720 (720p)

export class SelfClient extends Client {
  streamer: Streamer
  baseClient: BaseClient
  command: any

  streamStatus = {
    joined: false,
    joinsucc: false,
    playing: false,
    channelInfo: { guildId: '', channelId: '', cmdChannelId: '' },
    starttime: '00:00:00',
    timemark: '',
  }

  constructor(baseClient: BaseClient) {
    super()

    this.streamer = new Streamer(this)
    this.baseClient = baseClient

    this.command = command
  }

  // @ts-ignore
  statusIdle = () => new CustomStatus(this).setState(`𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷`).setEmoji('🎥')

  // @ts-ignore
  statusWatch = (name: string) => new CustomStatus(this).setState(`𝙑𝙚𝙣𝙙𝙤 ${name}`).setEmoji('🎥')

  async start(token: string): Promise<void> {
    await this.streamer.client.login(token)

    this.streamer.client.on('ready', () => {
      this.baseClient.logger.info(`Self bot is ready`)

      if (this.streamer.client.user)
        this.streamer.client.user.setActivity(this.statusIdle() as unknown as ActivityOptions)
    })

    this.streamer.client.on('voiceStateUpdate', (oldState, newState) => {
      // when exit channel
      if (oldState.member?.user.id === this.streamer.client.user?.id) {
        if (oldState.channelId && !newState.channelId) {
          this.streamStatus.joined = false
          this.streamStatus.joinsucc = false
          this.streamStatus.playing = true
          this.streamStatus.channelInfo = {
            guildId: '',
            channelId: '',
            cmdChannelId: this.streamStatus.channelInfo.cmdChannelId,
          }

          // set status to idle
          this.streamer.client.user?.setActivity(this.statusIdle() as unknown as ActivityOptions)
        }
      }

      // when join channel success
      if (newState.member?.user.id === this.streamer.client.user?.id) {
        if (newState.channelId && !oldState.channelId) {
          this.streamStatus.joined = true

          if (
            newState.guild.id === this.streamStatus.channelInfo.guildId &&
            newState.channelId === this.streamStatus.channelInfo.channelId
          )
            this.streamStatus.joinsucc = true
        }
      }
    })
  }

  async playVideo(member: any, guildId: string, link: string, name: string = '') {
    await this.streamer.joinVoice(guildId, member.voice.channelId)

    this.streamStatus.joined = true
    this.streamStatus.playing = false
    this.streamStatus.channelInfo = {
      guildId: guildId,
      channelId: member.voice.channelId,
      cmdChannelId: member.voice.channelId,
    }

    const channel = member.voice.channel

    if (channel instanceof StageChannel)
      await this.streamer.client.user!.voice!.setSuppressed(false)

    const streamLinkUdpConn = await this.streamer.createStream({
      width: 1280,
      height: 720,
      //hardwareAcceleratedDecoding: true,
      //h26xPreset: 'faster',
    })

    this.playStream(link, streamLinkUdpConn)
    this.streamer.client.user?.setActivity(this.statusWatch(name) as unknown as ActivityOptions)
  }

  async playStream(video: string, udpConn: MediaUdp) {
    let includeAudio = true

    // try {
    //   const metadata = await getInputMetadata(video)
    //   includeAudio = inputHasAudio(metadata)
    // } catch (e) {
    //   this.baseClient.logger.error(e)
    //   return
    // }

    this.baseClient.logger.info(`Starting video stream`)

    udpConn.mediaConnection.setSpeaking(true)
    udpConn.mediaConnection.setVideoStatus(true)

    try {
      console.log('streamLivestreamVideo', video, udpConn, includeAudio)
      const res = await streamLivestreamVideo(video, udpConn, includeAudio)
      this.baseClient.logger.info(`playing video: ${res}`)
    } catch (e) {
      this.baseClient.logger.error(`error playing video: ${e}`)
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
      // @ts-ignore
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
      // @ts-ignore
      readline.moveCursor(process.stdout, 0, -3)

      // send progress to discord
    }

    const hex = Math.random().toString(16).substring(2, 8)

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
        `./tmp/yt-${hex}.mkv`,
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

    return path.resolve(process.cwd(), `./tmp/yt-${hex}.mkv`)

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
    if (!this.streamer.client.guilds.cache.has(guildId)) {
      const inviteUrl = await this.baseClient.createInvite(guildId)
      console.log('inviteUrl', inviteUrl)
      // join to guild
      await this.streamer.client.acceptInvite(inviteUrl)
    } else {
      console.log('client user faz parte da guilda')
    }

    let ytUrl = await this.getVideoUrl(link).catch((error) => console.error('Error:', error))
    console.log('ytUrl', ytUrl)
    if (ytUrl) {
      const channel = member.voice.channel
      if (channel instanceof StageChannel)
        await this.streamer.client.user!.voice!.setSuppressed(false)

      await this.streamer.joinVoice(guildId, member.voice.channelId)

      const streamLinkUdpConn = await this.streamer.createStream()

      this.playStream(ytUrl, streamLinkUdpConn)
      this.streamer.client.user?.setActivity(this.statusWatch('') as unknown as ActivityOptions)
    }
  }
}

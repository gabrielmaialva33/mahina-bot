import fs from 'node:fs'
import { Client, StageChannel } from 'discord.js-selfbot-v13'
import { NewApi, Streamer, Utils } from '@dank074/discord-video-stream'
import type MahinaBot from '#common/mahina_bot'
import StreamQueue, { type StreamTrack } from '#common/stream_queue'

export default class SelfBot extends Client {
  streamer: Streamer
  mahinaBot: MahinaBot
  private ready = false
  queues: Map<string, StreamQueue> = new Map()
  private playbackCommands: Map<string, ReturnType<typeof NewApi.prepareStream>['command']> =
    new Map()

  constructor(mahinaBot1: MahinaBot) {
    super({
      allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    })
    this.streamer = new Streamer(this)
    this.mahinaBot = mahinaBot1
  }

  async start(token: string): Promise<void> {
    this.streamer.client.on('ready', async (client) => {
      this.ready = true
      this.mahinaBot.logger.info(`${client.user.username} is ready`)
      this.updateStatus('🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷')
    })

    await this.streamer.client.login(token).catch(console.error)
  }

  isReady(): boolean {
    return this.ready && Boolean(this.streamer.client.user)
  }

  getQueue(guildId: string): StreamQueue | undefined {
    return this.queues.get(guildId)
  }

  getOrCreateQueue(guildId: string): StreamQueue {
    let queue = this.queues.get(guildId)
    if (!queue) {
      queue = new StreamQueue()
      this.queues.set(guildId, queue)
    }
    return queue
  }

  destroyQueue(guildId: string): void {
    const queue = this.queues.get(guildId)
    if (queue) {
      queue.stop()
      this.queues.delete(guildId)
    }
    this.playbackCommands.delete(guildId)
  }

  /**
   * Enqueue a track. Starts playback if idle.
   * Returns the queue position (0 = playing now).
   */
  async enqueue(
    guildId: string,
    member: any,
    track: StreamTrack,
    textChannelId: string
  ): Promise<number> {
    // Selfbot can only be in one voice channel at a time
    const activeGuild = this.getActiveGuild()
    if (activeGuild && activeGuild !== guildId) {
      throw new Error('Selfbot já está transmitindo em outro servidor.')
    }

    const queue = this.getOrCreateQueue(guildId)
    queue.textChannelId = textChannelId
    const position = queue.add(track)

    if (!queue.isPlaying) {
      this.playNext(guildId, member).catch((err) => {
        this.mahinaBot.logger.error('Stream playNext error:', err)
      })
      return 0
    }

    return position
  }

  async playNext(guildId: string, member?: any): Promise<void> {
    const queue = this.getQueue(guildId)
    if (!queue) return

    const previousTrack = queue.current
    const track = queue.advance()

    // Cleanup previous file if needed
    if (previousTrack && previousTrack !== track && queue.shouldDeleteFile(previousTrack)) {
      this.cleanupFile(previousTrack)
    }

    if (!track) {
      this.streamer.leaveVoice()
      this.updateStatus('🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷')
      this.queues.delete(guildId)
      this.playbackCommands.delete(guildId)
      queue.emit('queueEnd')
      return
    }

    try {
      // Join voice if not already connected
      if (member?.voice?.channelId) {
        await this.streamer.joinVoice(guildId, member.voice.channelId)
        const channel = member.voice.channel
        if (channel instanceof StageChannel) {
          await this.streamer.client.user!.voice!.setSuppressed(false)
        }
      }

      this.updateStatus(`🎥 ${track.title} 🍷`)

      const source = track.resolvedPath || track.source
      const abortController = new AbortController()
      queue.abortController = abortController

      const { command, output } = NewApi.prepareStream(source, {
        width: 1280,
        height: 720,
        frameRate: 30,
        videoCodec: Utils.normalizeVideoCodec('H264'),
      })

      this.playbackCommands.set(guildId, command)

      queue.emit('trackStart', track)

      await NewApi.playStream(output, this.streamer).catch((error) => {
        if (!abortController.signal.aborted) {
          this.mahinaBot.logger.error('Error playing stream:', error)
        }
        command?.kill('SIGTERM')
      })

      this.playbackCommands.delete(guildId)

      // If aborted (skip/stop), don't auto-advance — the caller handles it
      if (abortController.signal.aborted) return

      // Auto-advance to next track
      await this.playNext(guildId, member)
    } catch (error) {
      this.mahinaBot.logger.error('Stream play error:', error)
      this.playbackCommands.delete(guildId)

      // Try next track on error
      await this.playNext(guildId, member)
    }
  }

  async skipTrack(guildId: string, member?: any): Promise<StreamTrack | null> {
    const queue = this.getQueue(guildId)
    if (!queue) return null

    const skipped = queue.skip()
    await this.playNext(guildId, member)
    return skipped
  }

  async goBack(guildId: string, member?: any): Promise<StreamTrack | null> {
    const queue = this.getQueue(guildId)
    if (!queue) return null

    const prev = queue.goBack()
    if (!prev) return null

    // Kill current stream, then play the restored track
    this.killCurrentProcess(guildId)
    await this.playCurrentTrack(guildId, member)
    return prev
  }

  stopStream(guildId: string): void {
    const queue = this.getQueue(guildId)
    if (queue) {
      const previousTrack = queue.current
      queue.stop()
      if (previousTrack && queue.shouldDeleteFile(previousTrack)) {
        this.cleanupFile(previousTrack)
      }
    }

    this.killCurrentProcess(guildId)
    this.streamer.stopStream()
    this.streamer.leaveVoice()
    this.updateStatus('🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷')
    this.queues.delete(guildId)
    this.playbackCommands.delete(guildId)
  }

  pauseStream(guildId: string): void {
    const cmd = this.playbackCommands.get(guildId)
    if (cmd) cmd.kill('SIGSTOP')
  }

  resumeStream(guildId: string): void {
    const cmd = this.playbackCommands.get(guildId)
    if (cmd) cmd.kill('SIGCONT')
  }

  private getActiveGuild(): string | null {
    for (const [guildId, queue] of this.queues) {
      if (queue.isPlaying) return guildId
    }
    return null
  }

  private killCurrentProcess(guildId: string): void {
    const cmd = this.playbackCommands.get(guildId)
    if (cmd) {
      cmd.kill('SIGTERM')
      this.playbackCommands.delete(guildId)
    }
  }

  private async playCurrentTrack(guildId: string, member?: any): Promise<void> {
    const queue = this.getQueue(guildId)
    if (!queue?.current) return

    const track = queue.current

    try {
      if (member?.voice?.channelId) {
        await this.streamer.joinVoice(guildId, member.voice.channelId)
      }

      this.updateStatus(`🎥 ${track.title} 🍷`)

      const source = track.resolvedPath || track.source
      const abortController = new AbortController()
      queue.abortController = abortController

      const { command, output } = NewApi.prepareStream(source, {
        width: 1280,
        height: 720,
        frameRate: 30,
        videoCodec: Utils.normalizeVideoCodec('H264'),
      })

      this.playbackCommands.set(guildId, command)

      queue.emit('trackStart', track)

      await NewApi.playStream(output, this.streamer).catch((error) => {
        if (!abortController.signal.aborted) {
          this.mahinaBot.logger.error('Error playing stream:', error)
        }
        command?.kill('SIGTERM')
      })

      this.playbackCommands.delete(guildId)

      if (abortController.signal.aborted) return

      await this.playNext(guildId, member)
    } catch (error) {
      this.mahinaBot.logger.error('Stream play error:', error)
      this.playbackCommands.delete(guildId)
      await this.playNext(guildId, member)
    }
  }

  private cleanupFile(track: StreamTrack): void {
    const filePath = track.resolvedPath || track.source
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (err) {
      this.mahinaBot.logger.error('Error cleaning up file:', err)
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

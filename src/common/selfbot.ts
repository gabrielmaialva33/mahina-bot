import fs from 'node:fs'
import { Client, StageChannel } from 'discord.js-selfbot-v13'
import { NewApi, Streamer, Utils } from '@dank074/discord-video-stream'
import type MahinaBot from '#common/mahina_bot'
import StreamQueue, { type StreamTrack } from '#common/stream_queue'

interface StreamMemberLike {
  voice?: {
    channelId?: string | null
    channel?: unknown
  }
}

export default class SelfBot extends Client {
  private static readonly IDLE_STATUS = '🎥 𝘾𝙡𝙪𝙗𝙚 𝘽𝙖𝙠𝙠𝙤 🍷'
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
      this.updateStatus(SelfBot.IDLE_STATUS)
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
    member: StreamMemberLike,
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

  async playNext(guildId: string, member?: StreamMemberLike): Promise<void> {
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
      this.updateStatus(SelfBot.IDLE_STATUS)
      this.queues.delete(guildId)
      this.playbackCommands.delete(guildId)
      queue.emit('queueEnd')
      return
    }

    if (!await this.ensureTrackReady(guildId, track, member)) return

    try {
      await this.joinVoiceIfNeeded(guildId, member)
      const aborted = await this.startStream(guildId, queue, track)
      if (aborted) return
      await this.playNext(guildId, member)
    } catch (error) {
      this.mahinaBot.logger.error('Stream play error:', error)
      this.playbackCommands.delete(guildId)

      // Auto-resume for local/url tracks (not youtube downloads)
      if (this.canResume(track)) {
        await this.resumeFromCrash(guildId, queue, track, member)
      } else {
        await this.playNext(guildId, member)
      }
    }
  }

  async skipTrack(guildId: string, member?: StreamMemberLike): Promise<StreamTrack | null> {
    const queue = this.getQueue(guildId)
    if (!queue) return null

    // Cancel download if current track is still downloading
    if (queue.current?.downloadId) {
      this.mahinaBot.downloadManager.cancelForTrack(queue.current)
    }

    const skipped = queue.skip()
    await this.playNext(guildId, member)
    return skipped
  }

  async goBack(guildId: string, member?: StreamMemberLike): Promise<StreamTrack | null> {
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
      // Cancel all active downloads for this queue
      for (const track of queue.tracks) {
        if (track.downloadId) this.mahinaBot.downloadManager.cancelForTrack(track)
      }
      if (queue.current?.downloadId) {
        this.mahinaBot.downloadManager.cancelForTrack(queue.current)
      }

      const previousTrack = queue.current
      queue.stop()
      if (previousTrack && queue.shouldDeleteFile(previousTrack)) {
        this.cleanupFile(previousTrack)
      }
    }

    this.killCurrentProcess(guildId)
    this.streamer.stopStream()
    this.streamer.leaveVoice()
    this.updateStatus(SelfBot.IDLE_STATUS)
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

  private async playCurrentTrack(guildId: string, member?: StreamMemberLike): Promise<void> {
    const queue = this.getQueue(guildId)
    if (!queue?.current) return

    const track = queue.current

    if (!await this.ensureTrackReady(guildId, track, member)) return

    try {
      await this.joinVoiceIfNeeded(guildId, member)
      const aborted = await this.startStream(guildId, queue, track)
      if (aborted) return
      await this.playNext(guildId, member)
    } catch (error) {
      this.mahinaBot.logger.error('Stream play error:', error)
      this.playbackCommands.delete(guildId)

      if (this.canResume(track)) {
        await this.resumeFromCrash(guildId, queue, track, member)
      } else {
        await this.playNext(guildId, member)
      }
    }
  }

  private async ensureTrackReady(
    guildId: string,
    track: StreamTrack,
    member?: StreamMemberLike
  ): Promise<boolean> {
    if (track.status === 'downloading') {
      try {
        await this.mahinaBot.downloadManager.waitForReady(track)
      } catch {
        this.mahinaBot.logger.warn(`Download failed for "${track.title}", skipping`)
        this.notifyDownloadError(guildId, track)
        await this.playNext(guildId, member)
        return false
      }
    }

    if (track.status === 'error') {
      this.mahinaBot.logger.warn(`Track "${track.title}" has error, skipping`)
      this.notifyDownloadError(guildId, track)
      await this.playNext(guildId, member)
      return false
    }

    return true
  }

  private async joinVoiceIfNeeded(guildId: string, member?: StreamMemberLike): Promise<void> {
    if (member?.voice?.channelId) {
      await this.streamer.joinVoice(guildId, member.voice.channelId)
      const channel = member.voice.channel
      if (channel instanceof StageChannel) {
        await this.streamer.client.user!.voice!.setSuppressed(false)
      }
    }
  }

  private async startStream(
    guildId: string,
    queue: StreamQueue,
    track: StreamTrack
  ): Promise<boolean> {
    this.updateStatus(`🎥 ${track.title} 🍷`)

    const source = track.resolvedPath || track.source
    const abortController = new AbortController()
    queue.abortController = abortController

    const streamOptions: Record<string, unknown> = {
      width: 1280,
      height: 720,
      frameRate: 30,
      videoCodec: Utils.normalizeVideoCodec('H264'),
    }

    // Seek support for resuming local/url streams
    if (track.seekTo && track.seekTo > 0) {
      streamOptions.customInputOptions = ['-ss', String(track.seekTo)]
      this.mahinaBot.logger.info(`Resuming "${track.title}" from ${track.seekTo}s`)
    }

    const { command, output } = NewApi.prepareStream(source, streamOptions)

    this.playbackCommands.set(guildId, command)
    track.playbackStartedAt = Date.now()

    queue.emit('trackStart', track)

    await NewApi.playStream(output, this.streamer).catch((error) => {
      if (!abortController.signal.aborted) {
        this.mahinaBot.logger.error('Error playing stream:', error)
      }
      command?.kill('SIGTERM')
    })

    this.playbackCommands.delete(guildId)

    if (abortController.signal.aborted) return true

    // Reset seek state on natural completion
    track.seekTo = undefined
    track.playbackStartedAt = undefined
    return false
  }

  private static readonly MAX_RESUME_ATTEMPTS = 3

  private canResume(track: StreamTrack): boolean {
    if (track.type !== 'local' && track.type !== 'url') return false
    if (track.status !== 'ready') return false
    return (track.resumeAttempts || 0) < SelfBot.MAX_RESUME_ATTEMPTS
  }

  private async resumeFromCrash(
    guildId: string,
    queue: StreamQueue,
    track: StreamTrack,
    member?: StreamMemberLike
  ): Promise<void> {
    track.resumeAttempts = (track.resumeAttempts || 0) + 1

    const elapsed = track.playbackStartedAt
      ? Math.floor((Date.now() - track.playbackStartedAt) / 1000)
      : 0
    const previousSeek = track.seekTo || 0
    track.seekTo = previousSeek + elapsed

    this.mahinaBot.logger.info(
      `Stream crashed for "${track.title}", resume attempt ${track.resumeAttempts}/${SelfBot.MAX_RESUME_ATTEMPTS} from ${track.seekTo}s`
    )

    this.notifyResume(guildId, track)

    try {
      await this.joinVoiceIfNeeded(guildId, member)
      const aborted = await this.startStream(guildId, queue, track)
      if (aborted) return
      await this.playNext(guildId, member)
    } catch (error) {
      this.mahinaBot.logger.error('Resume also failed, advancing:', error)
      this.playbackCommands.delete(guildId)
      await this.playNext(guildId, member)
    }
  }

  private notifyResume(guildId: string, track: StreamTrack): void {
    const queue = this.getQueue(guildId)
    if (!queue?.textChannelId) return

    const channel = this.mahinaBot.channels.cache.get(queue.textChannelId)
    if (channel?.isTextBased()) {
      const mins = Math.floor((track.seekTo || 0) / 60)
      const secs = (track.seekTo || 0) % 60
      channel
        .send({
          embeds: [
            this.mahinaBot
              .embed()
              .setColor(this.mahinaBot.color.yellow)
              .setDescription(
                `🔄 Stream caiu, retomando **${track.title}** de ${mins}:${String(secs).padStart(2, '0')}`
              )
              .setTimestamp(),
          ],
        })
        .catch(() => {})
    }
  }

  private notifyDownloadError(guildId: string, track: StreamTrack): void {
    const queue = this.getQueue(guildId)
    if (!queue?.textChannelId) return

    const channel = this.mahinaBot.channels.cache.get(queue.textChannelId)
    if (channel?.isTextBased()) {
      channel
        .send({
          embeds: [
            this.mahinaBot
              .embed()
              .setColor(this.mahinaBot.color.red)
              .setDescription(`❌ Download falhou: **${track.title}**\n${track.error || 'Erro desconhecido'}`)
              .setTimestamp(),
          ],
        })
        .catch(() => {})
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

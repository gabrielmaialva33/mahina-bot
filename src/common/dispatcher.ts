import { Node, Player, Track } from 'shoukaku'
import { Message, User } from 'discord.js'

import { BaseClient } from '#common/base_client'

export class Song implements Track {
  encoded: string
  info: {
    identifier: string
    isSeekable: boolean
    author: string
    length: number
    isStream: boolean
    position: number
    title: string
    uri?: string
    artworkUrl?: string
    isrc?: string
    sourceName: string
    requestedBy: User
  }
  pluginInfo: unknown

  constructor(track: Song | Track, user: User) {
    if (!track) throw new Error('Song must be a valid track')

    this.encoded = track.encoded
    this.info = {
      ...track.info,
      requestedBy: user,
    }
  }
}

export class Dispatcher {
  guildId: string
  channelId: string
  player: Player
  queue: Song[]
  stopped: boolean
  previous: Song | null
  current: Song | null
  loop: 'off' | 'repeat' | 'queue'
  requestedBy: User
  repeat: number
  node: Node
  shuffle: boolean
  paused: boolean
  filters: Array<string>
  autoplay: boolean
  nowPlayingMessage: Message | null
  history: Song[] = []
  private client: BaseClient

  constructor(options: DispatcherOptions) {
    this.client = options.client
    this.guildId = options.guildId
    this.channelId = options.channelId
    this.player = options.player
    this.queue = []
    this.stopped = false
    this.previous = null
    this.current = null
    this.loop = 'off'
    this.repeat = 0
    this.node = options.node
    this.shuffle = false
    this.paused = false
    this.filters = []
    this.autoplay = false
    this.nowPlayingMessage = null

    this.player
      .on('start', () => this.client.shoukaku.emit('trackStart', this.player, this.current, this))
      .on('end', () => {
        if (!this.queue.length)
          this.client.shoukaku.emit('queueEnd', this.player, this.current, this)
        this.client.shoukaku.emit('trackEnd', this.player, this.current, this)
      })
      .on('stuck', () => this.client.shoukaku.emit('trackStuck', this.player, this.current))
      .on('closed', (...arr) => {
        this.client.shoukaku.emit('socketClosed', this.player, ...arr)
      })
  }

  get exists(): boolean {
    return this.client.queue.has(this.guildId)
  }

  get volume(): number {
    return this.player.volume
  }

  async play(): Promise<void> {
    if (!this.exists || (!this.queue.length && !this.current)) return

    // @ts-ignore
    this.current = this.queue.length !== 0 ? this.queue.shift() : this.queue[0]
    if (!this.current) return

    this.player.playTrack({ track: this.current?.encoded })
    if (this.current) {
      this.history.push(this.current)
      if (this.history.length > 100) {
        this.history.shift()
      }
    }
  }

  pause(): void {
    if (!this.player) return
    if (!this.paused) {
      this.player.setPaused(true)
      this.paused = true
    } else {
      this.player.setPaused(false)
      this.paused = false
    }
  }

  remove(index: number): void {
    if (!this.player) return
    if (index > this.queue.length) return
    this.queue.splice(index, 1)
  }

  previousTrack(): void {
    if (!this.player) return
    if (!this.previous) return
    this.queue.unshift(this.previous)
    this.player.stopTrack()
  }

  destroy(): void {
    this.queue.length = 0
    this.history = []
    this.client.shoukaku.leaveVoiceChannel(this.guildId)
    this.client.queue.delete(this.guildId)
    if (this.stopped) return
    this.client.shoukaku.emit('playerDestroy', this.player)
  }

  setShuffle(shuffle: boolean): void {
    if (!this.player) return
    this.shuffle = shuffle
    if (shuffle) {
      const current = this.queue.shift()
      if (!current) return

      this.queue = this.queue.sort(() => Math.random() - 0.5)
      this.queue.unshift(current)
    } else {
      const current = this.queue.shift()
      if (!current) return

      this.queue = this.queue.sort((a: any, b: any) => a - b)
      this.queue.unshift(current)
    }
  }

  async skip(skipTo = 1): Promise<void> {
    if (!this.player) return
    if (skipTo > 1) {
      if (skipTo > this.queue.length) {
        this.queue.length = 0
      } else {
        this.queue.splice(0, skipTo - 1)
      }
    }
    this.repeat = this.repeat === 1 ? 0 : this.repeat
    this.player.stopTrack()
  }

  seek(time: number): void {
    if (!this.player) return
    this.player.seekTo(time)
  }

  stop(): void {
    if (!this.player) return
    this.queue.length = 0
    this.history = []
    this.loop = 'off'
    this.autoplay = false
    this.repeat = 0
    this.stopped = true
    this.player.stopTrack()
  }

  setLoop(loop: any): void {
    this.loop = loop
  }

  buildTrack(track: Song | Track, user: User): Song {
    return new Song(track, user)
  }

  async isPlaying(): Promise<void> {
    if (this.queue.length && !this.current && !this.player.paused) {
      this.play()
    }
  }

  async Autoplay(song: Song): Promise<void> {
    const resolve = await this.node.rest.resolve(
      `${this.client.env.SEARCH_ENGINE}:${song.info.author}`
    )
    if (!resolve || !resolve?.data || !Array.isArray(resolve.data)) return this.destroy()

    const metadata = resolve.data as Array<any> as any
    let choosed: Song | null = null
    const maxAttempts = 10 // Maximum number of attempts to find a unique song
    let attempts = 0
    while (attempts < maxAttempts) {
      if (!this.client.user)
        throw new Error('The bot user is not available, cannot play the next song')

      const potentialChoice = this.buildTrack(
        metadata[Math.floor(Math.random() * metadata.length)],
        this.client.user
      )
      if (
        !this.queue.some((s) => s.encoded === potentialChoice.encoded) &&
        !this.history.some((s) => s.encoded === potentialChoice.encoded)
      ) {
        choosed = potentialChoice
        break
      }
      attempts++
    }
    if (choosed) {
      this.queue.push(choosed)
      return await this.isPlaying()
    }
    return this.destroy()
  }

  async setAutoplay(autoplay: boolean): Promise<void> {
    this.autoplay = autoplay
    if (autoplay) {
      this.Autoplay(this.current ? this.current : this.queue[0])
    }
  }
}

export interface DispatcherOptions {
  client: BaseClient
  guildId: string
  channelId: string
  player: Player
  node: Node
}

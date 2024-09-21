import { LoadType, Node, Player, Track } from 'shoukaku'
import { Message, User } from 'discord.js'

import { BaseClient } from '#common/base_client'
import { SearchEngine } from '#src/types'

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
    this.info = { ...track.info, requestedBy: user }
  }
}

export interface DispatcherOptions {
  client: BaseClient
  guildId: string
  channelId: string
  player: Player
  node: Node
}

export class Dispatcher {
  guildId: string
  channelId: string
  player: Player
  queue: Song[]
  stopped: boolean
  previous: Song | null | undefined
  current: Song | null | undefined
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
    this.current = undefined
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

  play() {
    if (!(this.exists && (this.queue.length || this.current))) return
    this.current = this.queue.length ? this.queue.shift() : this.queue[0]
    if (this.current) {
      this.player.playTrack({ track: { encoded: this.current.encoded } })
      this.history.push(this.current)
      if (this.history.length > 100) this.history.shift()
    }
  }

  pause(): void {
    if (this.player) {
      this.paused = !this.paused
      this.player.setPaused(this.paused)
    }
  }

  remove(index: number): void {
    if (this.player && index <= this.queue.length) this.queue.splice(index, 1)
  }

  previousTrack(): void {
    if (this.player && this.previous) {
      this.queue.unshift(this.previous)
      this.player.stopTrack()
    }
  }

  destroy(): void {
    this.queue.length = 0
    this.history = []
    this.client.shoukaku.leaveVoiceChannel(this.guildId)
    this.player.destroy()
    this.client.queue.delete(this.guildId)
    if (!this.stopped) {
      this.client.shoukaku.emit('playerDestroy', this.player)
    }
  }

  setShuffle(): void {
    if (this.player) {
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]
      }
    }
  }

  skip(skipTo = 1): void {
    if (this.player) {
      if (skipTo > this.queue.length) this.queue.length = 0
      else this.queue.splice(0, skipTo - 1)
      this.repeat = this.repeat === 1 ? 0 : this.repeat
      this.player.stopTrack()
    }
  }

  seek(time: number): void {
    if (this.player) this.player.seekTo(time)
  }

  stop(): void {
    if (this.player) {
      this.queue.length = 0
      this.history = []
      this.loop = 'off'
      this.autoplay = false
      this.repeat = 0
      this.stopped = true
      this.player.stopTrack()
    }
  }

  setLoop(loop: 'off' | 'repeat' | 'queue'): void {
    this.loop = loop
  }

  buildTrack(track: Song | Track, user: User): Song {
    return new Song(track, user)
  }

  async isPlaying(): Promise<void> {
    if (this.queue.length && !this.current && !this.player.paused) await this.play()
  }

  async Autoplay(song: Song): Promise<void> {
    if (!song?.info) return

    try {
      const node = this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes)
      if (!node) return
      switch (song.info.sourceName) {
        case 'youtube': {
          const resolve = await node.rest.resolve(
            `${SearchEngine.YouTubeMusic}:${song.info.author}`
          )
          this.addAutoplayTrack(resolve)
          break
        }
        case 'soundcloud':
          await node.rest.resolve(`${SearchEngine.SoundCloud}:${song.info.author}`)
          break
        case 'spotify': {
          // need lavaSrc plugin in lavalink
          const data = await node.rest.resolve(`sprec:seed_tracks=${song.info.identifier}`)
          if (!data) return
          if (data.loadType === LoadType.PLAYLIST) {
            const tracks = data.data.tracks
            const trackUrl = tracks[Math.floor(Math.random() * tracks.length)]?.info?.uri
            if (!trackUrl) return
            const resolve = await node.rest.resolve(trackUrl)
            if (!resolve) return
            if (resolve.loadType === LoadType.TRACK) {
              const s = new Song(resolve.data, this.client.user!)
              this.queue.push(s)
              return this.isPlaying()
            }
          }
          break
        }
        // need jiosaavn plugin in lavalink (https://github.com/appujet/jiosaavn-plugin)
        case 'jiosaavn': {
          const data = await node.rest.resolve(`jsrec:${song.info.identifier}`)
          if (!data) return
          if (data.loadType === LoadType.PLAYLIST) {
            const tracks = data.data.tracks
            const trackUrl = tracks[Math.floor(Math.random() * tracks.length)]?.info?.uri
            if (!trackUrl) return
            const resolve = await node.rest.resolve(trackUrl)
            if (!resolve) return
            if (resolve.loadType === LoadType.TRACK) {
              const s = new Song(resolve.data, this.client.user!)
              this.queue.push(s)
              return this.isPlaying()
            }
          }
          break
        }
        case 'deezer': {
          const resolve = await node.rest.resolve(`${SearchEngine.Deezer}:${song.info.author}`)
          this.addAutoplayTrack(resolve)
          break
        }
        case 'applemusic': {
          const resolve = await node.rest.resolve(`${SearchEngine.Apple}:${song.info.author}`)
          this.addAutoplayTrack(resolve)
          break
        }
        default: {
          const resolve = await node.rest.resolve(
            `${SearchEngine.YouTubeMusic}:${song.info.author}`
          )
          this.addAutoplayTrack(resolve)
          break
        }
      }
    } catch (_error) {
      return this.destroy()
    }
  }

  async setAutoplay(autoplay: boolean): Promise<void> {
    this.autoplay = autoplay
    if (autoplay) {
      await this.Autoplay(this.current || this.queue[0])
    }
  }

  private addAutoplayTrack(resolve: any) {
    if (!(resolve?.data && Array.isArray(resolve.data))) {
      console.error('Failed to fetch node resolve data.')
      return this.destroy()
    }

    let choosed: Song | null = null
    const maxAttempts = 10
    let attempts = 0

    const metadata = resolve.data as any[] as any

    while (attempts < maxAttempts) {
      const potentialChoice = new Song(
        metadata[Math.floor(Math.random() * metadata.length)],
        this.client.user!
      )
      if (
        !(
          this.queue.some((s) => s.encoded === potentialChoice.encoded) ||
          this.history.some((s) => s.encoded === potentialChoice.encoded)
        )
      ) {
        choosed = potentialChoice
        break
      }
      attempts++
    }

    if (choosed) {
      this.queue.push(choosed)
      return this.isPlaying()
    }
  }
}

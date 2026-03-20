import { EventEmitter } from 'node:events'

export type LoopMode = 'off' | 'track' | 'queue'
export type StreamTrackType = 'local' | 'youtube' | 'url'

export type StreamTrackStatus = 'ready' | 'downloading' | 'error'

export interface StreamTrack {
  type: StreamTrackType
  source: string
  resolvedPath?: string
  title: string
  thumbnail?: string
  duration?: number
  author?: string
  url?: string
  requester: { id: string; username: string }
  deleteAfterPlay: boolean
  status: StreamTrackStatus
  downloadId?: string
  error?: string
  seekTo?: number
  playbackStartedAt?: number
  resumeAttempts?: number
}

export default class StreamQueue extends EventEmitter {
  tracks: StreamTrack[] = []
  current: StreamTrack | null = null
  previous: StreamTrack[] = []
  loopMode: LoopMode = 'off'
  textChannelId: string | null = null
  abortController: AbortController | null = null
  private isAdvancing = false

  add(track: StreamTrack): number {
    this.tracks.push(track)
    return this.tracks.length
  }

  addNext(track: StreamTrack): void {
    this.tracks.unshift(track)
  }

  advance(): StreamTrack | null {
    if (this.isAdvancing) return null
    this.isAdvancing = true

    try {
      if (this.loopMode === 'track' && this.current) {
        return this.current
      }

      if (this.current) {
        this.previous.unshift(this.current)
        if (this.previous.length > 50) this.previous.pop()

        if (this.loopMode === 'queue') {
          this.tracks.push(this.current)
        }
      }

      const next = this.tracks.shift() ?? null
      this.current = next
      return next
    } finally {
      this.isAdvancing = false
    }
  }

  skip(): StreamTrack | null {
    this.abortCurrent()
    return this.current
  }

  stop(): void {
    this.abortCurrent()
    this.tracks = []
    this.current = null
    this.loopMode = 'off'
  }

  clear(): void {
    this.tracks = []
  }

  goBack(): StreamTrack | null {
    if (this.previous.length === 0) return null

    this.abortCurrent()

    if (this.current) {
      this.tracks.unshift(this.current)
    }

    const prev = this.previous.shift()!
    this.current = prev
    return prev
  }

  cycleLoop(): LoopMode {
    const modes: LoopMode[] = ['off', 'track', 'queue']
    const idx = modes.indexOf(this.loopMode)
    this.loopMode = modes[(idx + 1) % modes.length]
    return this.loopMode
  }

  get size(): number {
    return this.tracks.length
  }

  get isEmpty(): boolean {
    return this.tracks.length === 0 && !this.current
  }

  get isPlaying(): boolean {
    return this.current !== null
  }

  shouldDeleteFile(track: StreamTrack): boolean {
    if (!track.deleteAfterPlay) return false
    if (this.loopMode === 'track' && this.current === track) return false
    if (this.loopMode === 'queue') return false
    return true
  }

  private abortCurrent(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

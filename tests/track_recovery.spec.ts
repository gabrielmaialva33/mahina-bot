import { describe, expect, it, vi } from 'vitest'
import type { Player, SearchResult, Track, TrackExceptionEvent } from 'lavalink-client'

import TrackError from '#src/events/player/track_error'
import type MahinaBot from '#common/mahina_bot'

function makeTrack(overrides: Partial<Track['info']> = {}): Track {
  return {
    encoded: 'encoded-track',
    info: {
      identifier: 'spotify-id',
      title: 'Livid',
      author: 'Jawbox',
      duration: 235_600,
      artworkUrl: null,
      uri: 'https://open.spotify.com/track/spotify-id',
      sourceName: 'spotify',
      isSeekable: true,
      isStream: false,
      isrc: 'US24E9810281',
      ...overrides,
    },
    pluginInfo: {},
    requester: { id: 'requester' },
  }
}

function makeSearchResult(track: Track): SearchResult {
  return {
    loadType: 'search',
    tracks: [track],
    playlist: null,
  } as SearchResult
}

function makeClient(fallenApi?: {
  isAvailable: () => boolean
  resolveStreamUrl: (uri: string, video?: boolean) => Promise<string | null>
}) {
  return {
    services: {
      serverAwareness: undefined,
      fallenApi,
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as MahinaBot
}

function makePlayer(result: SearchResult) {
  return {
    search: vi.fn().mockResolvedValue(result),
    queue: {
      add: vi.fn(),
      tracks: [],
    },
    playing: false,
    paused: false,
    play: vi.fn().mockResolvedValue(undefined),
  } as unknown as Player
}

const antiBotPayload = {
  exception: {
    message:
      '(yts.version: 1.18.1) All clients failed to load the item. Sign in to confirm you’re not a bot',
    severity: 'common',
    cause: 'youtube blocked the request',
  },
} as TrackExceptionEvent

describe('TrackError recovery', () => {
  it('re-resolves a blocked Spotify track through its ISRC and queues one direct YouTube retry', async () => {
    const youtubeTrack = makeTrack({
      identifier: 'X_cR_7bKvJk',
      uri: 'https://www.youtube.com/watch?v=X_cR_7bKvJk',
      sourceName: 'youtube',
    })
    const player = makePlayer(makeSearchResult(youtubeTrack))
    const event = new TrackError(makeClient(), 'track_error.ts')
    const spotifyTrack = makeTrack()

    await event.run(player, spotifyTrack, antiBotPayload)

    expect(player.search).toHaveBeenCalledWith(
      { query: 'ytsearch:"US24E9810281"' },
      spotifyTrack.requester
    )
    expect(player.queue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        info: expect.objectContaining({ sourceName: 'youtube' }),
        userData: expect.objectContaining({ mahinaRecoveryAttempted: 1 }),
      }),
      0
    )
    expect(player.play).toHaveBeenCalledOnce()
  })

  it('does not retry the same recovered track twice', async () => {
    const retryTrack = makeTrack({ sourceName: 'youtube' })
    retryTrack.userData = { mahinaRecoveryAttempted: 1 }
    const player = makePlayer(makeSearchResult(retryTrack))
    const event = new TrackError(makeClient(), 'track_error.ts')

    await event.run(player, retryTrack, antiBotPayload)

    expect(player.search).not.toHaveBeenCalled()
    expect(player.queue.add).not.toHaveBeenCalled()
    expect(player.play).not.toHaveBeenCalled()
  })

  it('does not retry unrelated Spotify playback errors', async () => {
    const player = makePlayer(makeSearchResult(makeTrack()))
    const event = new TrackError(makeClient(), 'track_error.ts')

    await event.run(player, makeTrack(), {
      exception: { message: 'The video was deleted', severity: 'common', cause: 'gone' },
    } as TrackExceptionEvent)

    expect(player.search).not.toHaveBeenCalled()
    expect(player.queue.add).not.toHaveBeenCalled()
  })

  it('falls back from ISRC to title and author when the ISRC search is empty', async () => {
    const youtubeTrack = makeTrack({
      identifier: 'fallback-id',
      uri: 'https://www.youtube.com/watch?v=fallback-id',
      sourceName: 'youtube',
    })
    const player = makePlayer(makeSearchResult(youtubeTrack))
    vi.mocked(player.search)
      .mockResolvedValueOnce({ loadType: 'empty', tracks: [], playlist: null } as SearchResult)
      .mockResolvedValueOnce(makeSearchResult(youtubeTrack))
    const spotifyTrack = makeTrack()
    const event = new TrackError(makeClient(), 'track_error.ts')

    await event.run(player, spotifyTrack, antiBotPayload)

    expect(player.search).toHaveBeenNthCalledWith(
      2,
      { query: 'ytsearch:Livid Jawbox' },
      spotifyTrack.requester
    )
    expect(player.queue.add).toHaveBeenCalledOnce()
  })

  it('prefers a OneGrab CDN stream when the integration is available', async () => {
    const youtubeTrack = makeTrack({
      identifier: 'X_cR_7bKvJk',
      uri: 'https://www.youtube.com/watch?v=X_cR_7bKvJk',
      sourceName: 'youtube',
    })
    const cdnTrack = makeTrack({
      identifier: 'cdn-stream',
      uri: 'https://cdn.onegrab.fun/audio.mp3',
      sourceName: 'http',
    })
    const player = makePlayer(makeSearchResult(youtubeTrack))
    vi.mocked(player.search)
      .mockResolvedValueOnce(makeSearchResult(youtubeTrack))
      .mockResolvedValueOnce(makeSearchResult(cdnTrack))
    const fallenApi = {
      isAvailable: vi.fn().mockReturnValue(true),
      resolveStreamUrl: vi.fn().mockResolvedValue('https://cdn.onegrab.fun/audio.mp3'),
    }
    const event = new TrackError(makeClient(fallenApi), 'track_error.ts')

    await event.run(player, makeTrack(), antiBotPayload)

    expect(fallenApi.resolveStreamUrl).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=X_cR_7bKvJk',
      false
    )
    expect(player.search).toHaveBeenNthCalledWith(
      2,
      { query: 'https://cdn.onegrab.fun/audio.mp3' },
      { id: 'requester' }
    )
    expect(player.queue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        info: expect.objectContaining({ sourceName: 'http' }),
        userData: expect.objectContaining({ mahinaRecoveryAttempted: 1 }),
      }),
      0
    )
  })
})

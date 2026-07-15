import { describe, expect, it, vi } from 'vitest'
import type { Player, SearchResult, Track, TrackStuckEvent } from 'lavalink-client'

import type MahinaBot from '#common/mahina_bot'
import TrackStuck from '#src/events/player/track_stuck'

function makeTrack(sourceName = 'spotify'): Track {
  return {
    encoded: `${sourceName}-encoded`,
    info: {
      identifier: `${sourceName}-id`,
      title: 'Hallogallo',
      author: 'NEU!',
      duration: 607_000,
      artworkUrl: 'https://example.com/cover.jpg',
      uri: `https://example.com/${sourceName}`,
      sourceName,
      isSeekable: true,
      isStream: false,
    },
    pluginInfo: {},
    requester: { id: 'requester' },
  }
}

function makeClient(): MahinaBot {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as MahinaBot
}

describe('TrackStuck recovery', () => {
  it('replaces a stuck track with a playable SoundCloud result', async () => {
    const stuckTrack = makeTrack()
    const soundCloudTrack = makeTrack('soundcloud')
    const player = {
      search: vi.fn().mockResolvedValue({
        loadType: 'search',
        tracks: [soundCloudTrack],
        playlist: null,
      } as SearchResult),
      queue: { current: stuckTrack },
      play: vi.fn().mockResolvedValue(undefined),
    } as unknown as Player
    const event = new TrackStuck(makeClient(), 'track_stuck.ts')

    await event.run(player, stuckTrack, {
      type: 'TrackStuckEvent',
      guildId: 'guild',
      thresholdMs: 30_000,
      track: soundCloudTrack,
    } as TrackStuckEvent)

    expect(player.search).toHaveBeenCalledWith(
      { query: 'scsearch:Hallogallo NEU!' },
      stuckTrack.requester
    )
    expect(player.queue.current).toEqual(
      expect.objectContaining({
        info: expect.objectContaining({ sourceName: 'soundcloud', title: 'Hallogallo' }),
        userData: expect.objectContaining({ mahinaRecoveryAttempted: 1 }),
      })
    )
    expect(player.play).toHaveBeenCalledWith({
      track: expect.objectContaining({
        info: expect.objectContaining({ sourceName: 'soundcloud' }),
      }),
      paused: false,
    })
  })

  it('does not loop when the fallback itself gets stuck', async () => {
    const fallback = makeTrack('soundcloud')
    fallback.userData = { mahinaRecoveryAttempted: 1 }
    const player = {
      search: vi.fn(),
      queue: { current: fallback },
      play: vi.fn(),
    } as unknown as Player
    const event = new TrackStuck(makeClient(), 'track_stuck.ts')

    await event.run(player, fallback, {
      type: 'TrackStuckEvent',
      guildId: 'guild',
      thresholdMs: 30_000,
      track: fallback,
    } as TrackStuckEvent)

    expect(player.search).not.toHaveBeenCalled()
    expect(player.play).not.toHaveBeenCalled()
  })
})

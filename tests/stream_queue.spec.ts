import { describe, it, expect, beforeEach } from 'vitest'
import StreamQueue, { type StreamTrack } from '#common/stream_queue'

function makeTrack(title: string, overrides?: Partial<StreamTrack>): StreamTrack {
  return {
    type: 'local',
    source: `/path/${title}.mp4`,
    title,
    requester: { id: '123', username: 'test' },
    deleteAfterPlay: false,
    status: 'ready',
    ...overrides,
  }
}

describe('StreamQueue', () => {
  let queue: StreamQueue

  beforeEach(() => {
    queue = new StreamQueue()
  })

  describe('add/size', () => {
    it('starts empty', () => {
      expect(queue.size).toBe(0)
      expect(queue.isEmpty).toBe(true)
    })

    it('adds tracks and returns position', () => {
      expect(queue.add(makeTrack('A'))).toBe(1)
      expect(queue.add(makeTrack('B'))).toBe(2)
      expect(queue.size).toBe(2)
    })

    it('addNext inserts at front', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.addNext(makeTrack('C'))
      const first = queue.advance()
      expect(first?.title).toBe('C')
    })
  })

  describe('advance', () => {
    it('returns null on empty queue', () => {
      expect(queue.advance()).toBeNull()
    })

    it('advances through tracks in order', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))

      expect(queue.advance()?.title).toBe('A')
      expect(queue.current?.title).toBe('A')
      expect(queue.advance()?.title).toBe('B')
      expect(queue.advance()).toBeNull()
    })

    it('stores previous tracks', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.advance()
      queue.advance()

      expect(queue.previous.length).toBe(1)
      expect(queue.previous[0].title).toBe('A')
    })

    it('caps previous at 50', () => {
      for (let i = 0; i < 55; i++) {
        queue.add(makeTrack(`track-${i}`))
      }
      for (let i = 0; i < 55; i++) {
        queue.advance()
      }
      expect(queue.previous.length).toBe(50)
    })
  })

  describe('loop modes', () => {
    it('loops single track', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.loopMode = 'track'

      const first = queue.advance()
      expect(first?.title).toBe('A')
      const second = queue.advance()
      expect(second?.title).toBe('A')
    })

    it('loops queue', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.loopMode = 'queue'

      queue.advance() // A
      queue.advance() // B (A goes back to queue)
      const third = queue.advance() // A again
      expect(third?.title).toBe('A')
    })

    it('cycles loop mode', () => {
      expect(queue.cycleLoop()).toBe('track')
      expect(queue.cycleLoop()).toBe('queue')
      expect(queue.cycleLoop()).toBe('off')
    })
  })

  describe('skip', () => {
    it('returns current track', () => {
      queue.add(makeTrack('A'))
      queue.advance()
      const skipped = queue.skip()
      expect(skipped?.title).toBe('A')
    })
  })

  describe('stop', () => {
    it('clears everything', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.advance()
      queue.stop()

      expect(queue.isEmpty).toBe(true)
      expect(queue.current).toBeNull()
      expect(queue.loopMode).toBe('off')
    })
  })

  describe('goBack', () => {
    it('returns null with no previous', () => {
      expect(queue.goBack()).toBeNull()
    })

    it('goes back to previous track', () => {
      queue.add(makeTrack('A'))
      queue.add(makeTrack('B'))
      queue.advance() // A
      queue.advance() // B

      const prev = queue.goBack()
      expect(prev?.title).toBe('A')
      expect(queue.current?.title).toBe('A')
      // B should be first in queue now
      expect(queue.tracks[0]?.title).toBe('B')
    })
  })

  describe('shouldDeleteFile', () => {
    it('respects deleteAfterPlay flag', () => {
      const track = makeTrack('A', { deleteAfterPlay: true })
      expect(queue.shouldDeleteFile(track)).toBe(true)
    })

    it('does not delete if not flagged', () => {
      const track = makeTrack('A', { deleteAfterPlay: false })
      expect(queue.shouldDeleteFile(track)).toBe(false)
    })

    it('does not delete on track loop', () => {
      const track = makeTrack('A', { deleteAfterPlay: true })
      queue.add(track)
      queue.advance()
      queue.loopMode = 'track'
      expect(queue.shouldDeleteFile(track)).toBe(false)
    })

    it('does not delete on queue loop', () => {
      const track = makeTrack('A', { deleteAfterPlay: true })
      queue.loopMode = 'queue'
      expect(queue.shouldDeleteFile(track)).toBe(false)
    })
  })

  describe('status fields', () => {
    it('tracks download status', () => {
      const track = makeTrack('A', { status: 'downloading', downloadId: 'dl_1' })
      queue.add(track)
      expect(queue.tracks[0].status).toBe('downloading')

      track.status = 'ready'
      expect(queue.tracks[0].status).toBe('ready')
    })

    it('tracks seek and resume state', () => {
      const track = makeTrack('A', { seekTo: 120, resumeAttempts: 2 })
      queue.add(track)
      expect(queue.tracks[0].seekTo).toBe(120)
      expect(queue.tracks[0].resumeAttempts).toBe(2)
    })
  })
})

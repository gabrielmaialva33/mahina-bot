import type { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'

export default class TrackError extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'trackError',
    })
  }

  async run(
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: TrackExceptionEvent
  ): Promise<void> {
    this.client.services.serverAwareness?.observeTrackError(player, track, payload)

    const fallen = this.client.services.fallenApi
    const cause = payload.exception?.message ?? 'unknown'
    const uri = track?.info?.uri
    const sourceName = track?.info?.sourceName ?? ''

    this.client.logger.warn(
      `Track error on ${uri ?? '?'} source=${sourceName} cause=${cause.slice(0, 120)}`
    )

    if (!fallen?.isAvailable() || !uri) return
    if (!/youtube|youtubemusic/i.test(sourceName)) return

    const stream = await fallen.resolveStreamUrl(uri).catch(() => null)
    if (!stream) {
      this.client.logger.debug(`FallenAPI: no stream for ${uri}`)
      return
    }

    try {
      const requester = (track as Track | UnresolvedTrack)?.requester ?? this.client.user
      const result = await player.search({ query: stream }, requester)
      if (!result?.tracks?.length) return

      const replacement = result.tracks[0]
      // preserve metadata from the original (Fallen returns t.me / sf-converter naming)
      if (track?.info) {
        replacement.info.title = track.info.title || replacement.info.title
        replacement.info.author = track.info.author || replacement.info.author
        replacement.info.artworkUrl = track.info.artworkUrl ?? replacement.info.artworkUrl
      }

      await player.queue.add(replacement, 0)
      if (!player.playing && !player.paused) {
        await player.play()
      }
      this.client.logger.info(`Fallen fallback queued: ${replacement.info.title}`)
    } catch (err) {
      this.client.logger.error(`Fallen fallback playback failed: ${String(err)}`)
    }
  }
}

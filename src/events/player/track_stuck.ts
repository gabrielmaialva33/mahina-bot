import type { Player, Track, TrackStuckEvent } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import {
  hasRecoveryAttempted,
  markRecoveryAttempted,
  playRecoveryTrack,
  resolveSoundCloudReplacement,
} from '#utils/functions/music_recovery'

export default class TrackStuck extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'trackStuck',
    })
  }

  async run(player: Player, track: Track | null, payload: TrackStuckEvent): Promise<void> {
    const threshold = payload.thresholdMs ?? 0
    this.client.logger.warn(
      `Track stuck on ${track?.info.uri ?? '?'} source=${track?.info.sourceName ?? '?'} threshold=${threshold}ms`
    )

    if (!track || hasRecoveryAttempted(track)) return
    markRecoveryAttempted(track)

    try {
      const replacement = await resolveSoundCloudReplacement(player, track)
      if (!replacement) {
        this.client.logger.warn(
          `Music recovery found no SoundCloud replacement for ${track.info.title}`
        )
        return
      }

      await playRecoveryTrack(player, replacement)
      this.client.logger.info(`Music recovery playing SoundCloud fallback for ${track.info.title}`)
    } catch (error) {
      this.client.logger.error(`Music stuck recovery failed: ${String(error)}`)
    }
  }
}

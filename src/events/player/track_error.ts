import type { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import Event from '#common/event'
import type MahinaBot from '#common/mahina_bot'
import { hasRecoveryAttempted, markRecoveryAttempted } from '#utils/functions/music_recovery'

const YOUTUBE_ACCESS_ERROR =
  /all clients failed|sign in to confirm|not a bot|requires login|http (?:error )?403|forbidden|requested format is not available/i

function recoveryQueries(track: Track | UnresolvedTrack): string[] {
  const queries: string[] = []
  const isrc = track.info.isrc?.trim()
  if (isrc) queries.push(`ytsearch:"${isrc.replace(/[^a-z0-9-]/gi, '')}"`)

  const titleAndAuthor = `${track.info.title} ${track.info.author ?? ''}`.trim()
  if (titleAndAuthor) queries.push(`ytsearch:${titleAndAuthor}`)
  return [...new Set(queries)]
}

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

    const cause = payload.exception?.message ?? 'unknown'
    const uri = track?.info?.uri
    const sourceName = track?.info?.sourceName ?? ''

    const logCause = cause.replace(/\s+/g, ' ').trim().slice(0, 2_000)
    this.client.logger.warn(`Track error on ${uri ?? '?'} source=${sourceName} cause=${logCause}`)

    if (!track || hasRecoveryAttempted(track)) return
    if (!/spotify|youtube|youtubemusic/i.test(sourceName)) return
    if (!YOUTUBE_ACCESS_ERROR.test(cause)) return

    markRecoveryAttempted(track)

    try {
      const requester = track.requester ?? this.client.user
      let replacement: Track | UnresolvedTrack | undefined

      for (const query of recoveryQueries(track)) {
        const result = await player.search({ query }, requester)
        replacement = result?.tracks?.find((candidate) =>
          /youtube|youtubemusic/i.test(candidate.info.sourceName ?? '')
        )
        if (replacement) break
      }

      if (!replacement) {
        this.client.logger.warn(
          `Music recovery found no YouTube replacement for ${track.info.title}`
        )
        return
      }

      let recoveryPath = 'direct YouTube retry'
      const oneGrab = this.client.services.fallenApi
      if (oneGrab?.isAvailable() && replacement.info.uri) {
        const stream = await oneGrab.resolveStreamUrl(replacement.info.uri, false)
        if (stream) {
          try {
            const streamResult = await player.search({ query: stream }, requester)
            const streamReplacement = streamResult?.tracks?.[0]
            if (streamReplacement) {
              replacement = streamReplacement
              recoveryPath = 'OneGrab CDN'
            }
          } catch (error) {
            this.client.logger.warn(`OneGrab stream could not be loaded: ${String(error)}`)
          }
        }
      }

      if (track?.info) {
        replacement.info.title = track.info.title || replacement.info.title
        replacement.info.author = track.info.author || replacement.info.author
        replacement.info.artworkUrl = track.info.artworkUrl ?? replacement.info.artworkUrl
      }
      markRecoveryAttempted(replacement)

      await player.queue.add(replacement, 0)
      if (!player.playing && !player.paused) {
        await player.play()
      }
      this.client.logger.info(`Music recovery queued ${recoveryPath} for ${replacement.info.title}`)
    } catch (err) {
      this.client.logger.error(`Music recovery failed: ${String(err)}`)
    }
  }
}

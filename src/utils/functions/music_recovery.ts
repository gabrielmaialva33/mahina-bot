import type { Player, Track, TrackRequester, UnresolvedTrack } from 'lavalink-client'

const RECOVERY_ATTEMPTED_KEY = 'mahinaRecoveryAttempted'

export function hasRecoveryAttempted(track: Track | UnresolvedTrack): boolean {
  return track.userData?.[RECOVERY_ATTEMPTED_KEY] === 1
}

export function markRecoveryAttempted(track: Track | UnresolvedTrack): void {
  track.userData = { ...track.userData, [RECOVERY_ATTEMPTED_KEY]: 1 }
}

export async function resolveSoundCloudReplacement(
  player: Player,
  track: Track | UnresolvedTrack,
  requester: TrackRequester | undefined = track.requester
): Promise<Track | null> {
  const query = `${track.info.title} ${track.info.author ?? ''}`.trim()
  if (!query) return null

  const result = await player.search({ query: `scsearch:${query}` }, requester)
  const replacement = result?.tracks?.find(
    (candidate): candidate is Track =>
      !('resolve' in candidate) && candidate.info.sourceName?.toLowerCase() === 'soundcloud'
  )
  if (!replacement) return null

  replacement.info.title = track.info.title || replacement.info.title
  replacement.info.author = track.info.author || replacement.info.author
  replacement.info.artworkUrl = track.info.artworkUrl ?? replacement.info.artworkUrl
  markRecoveryAttempted(replacement)
  return replacement
}

export async function playRecoveryTrack(player: Player, replacement: Track): Promise<void> {
  player.queue.current = replacement
  await player.play({ track: replacement, paused: false })
}

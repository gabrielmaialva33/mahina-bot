import { ChannelType, type GuildMember, type VoiceChannel } from 'discord.js'
import type { Player, Track } from 'lavalink-client'

import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export function getMemberVoiceChannel(member: Context['member']): VoiceChannel | null {
  if (!member || !('voice' in member)) {
    return null
  }

  const channel = member.voice?.channel
  return channel?.type === ChannelType.GuildVoice ? (channel as VoiceChannel) : null
}

export function isGuildMember(member: Context['member']): member is GuildMember {
  return Boolean(member && 'voice' in member)
}

export async function ensureConnectedPlayer(
  client: MahinaBot,
  ctx: Context,
  memberVoiceChannel: VoiceChannel
): Promise<Player> {
  let player = client.manager.getPlayer(ctx.guild.id)

  if (!player) {
    player = client.manager.createPlayer({
      guildId: ctx.guild.id,
      voiceChannelId: memberVoiceChannel.id,
      textChannelId: ctx.channel.id,
      selfMute: false,
      selfDeaf: true,
      vcRegion: memberVoiceChannel.rtcRegion!,
    })
  }

  if (!player.connected) {
    await player.connect()
  }

  return player
}

export async function startPlayerIfIdle(player: Player): Promise<void> {
  if (!player.playing && player.queue.tracks.length > 0) {
    await player.play({ paused: false })
  }
}

export async function enqueueTrack(player: Player, track: Track): Promise<void> {
  player.queue.add(track)
  await startPlayerIfIdle(player)
}

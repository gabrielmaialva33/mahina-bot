import { ChannelType, type GuildMember, type Message, type VoiceState } from 'discord.js'
import type { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'
import type MahinaBot from '#common/mahina_bot'

type AwarenessEventKind =
  | 'voice_join'
  | 'voice_leave'
  | 'voice_move'
  | 'player_start'
  | 'player_end'
  | 'player_error'
  | 'player_disconnect'
  | 'queue_end'
  | 'channel_create'
  | 'channel_delete'
  | 'member_join'

interface AwarenessEvent {
  guildId: string
  channelId?: string
  userId?: string
  userName?: string
  kind: AwarenessEventKind
  summary: string
  timestamp: number
  weight: number
}

interface ChannelActivity {
  guildId: string
  channelId: string
  channelName: string
  count: number
  lastMessageAt: number
  users: Map<string, string>
}

const MAX_EVENTS_PER_GUILD = 120
const EVENT_TTL_MS = 45 * 60 * 1000
const ACTIVITY_TTL_MS = 15 * 60 * 1000
const MAX_SUMMARY_CHARS = 260

export class MahinaServerAwarenessService {
  private eventsByGuild = new Map<string, AwarenessEvent[]>()
  private activityByChannel = new Map<string, ChannelActivity>()

  constructor(private client: MahinaBot) {}

  observeMessage(message: Message): void {
    if (!message.guildId || message.author.bot) return

    const key = this.channelKey(message.guildId, message.channelId)
    const channelName =
      'name' in message.channel && message.channel.name ? message.channel.name : message.channelId
    const existing =
      this.activityByChannel.get(key) ??
      ({
        guildId: message.guildId,
        channelId: message.channelId,
        channelName,
        count: 0,
        lastMessageAt: Date.now(),
        users: new Map<string, string>(),
      } satisfies ChannelActivity)

    existing.channelName = channelName
    existing.count += 1
    existing.lastMessageAt = Date.now()
    existing.users.set(message.author.id, message.member?.displayName || message.author.username)

    if (existing.users.size > 12) {
      const oldest = existing.users.keys().next().value
      if (oldest) existing.users.delete(oldest)
    }

    this.activityByChannel.set(key, existing)
  }

  observeVoiceState(
    type: 'join' | 'leave' | 'move',
    oldState: VoiceState,
    newState: VoiceState
  ): void {
    const guildId = newState.guild.id
    const member = newState.member ?? oldState.member
    const userName = member?.displayName || newState.member?.user.username || oldState.id
    const isBot = newState.id === this.client.user?.id
    const subject = isBot ? 'Mahina' : userName

    if (type === 'join' && newState.channel) {
      this.observe({
        guildId,
        channelId: newState.channelId ?? undefined,
        userId: newState.id,
        userName,
        kind: 'voice_join',
        summary: `${subject} entrou no canal de voz "${newState.channel.name}"`,
        weight: isBot ? 0.95 : 0.82,
      })
      return
    }

    if (type === 'leave' && oldState.channel) {
      this.observe({
        guildId,
        channelId: oldState.channelId ?? undefined,
        userId: oldState.id,
        userName,
        kind: 'voice_leave',
        summary: `${subject} saiu do canal de voz "${oldState.channel.name}"`,
        weight: isBot ? 0.95 : 0.74,
      })
      return
    }

    if (type === 'move' && oldState.channel && newState.channel) {
      this.observe({
        guildId,
        channelId: newState.channelId ?? undefined,
        userId: newState.id,
        userName,
        kind: 'voice_move',
        summary: `${subject} moveu do voice "${oldState.channel.name}" para "${newState.channel.name}"`,
        weight: isBot ? 0.98 : 0.84,
      })
    }
  }

  observeChannelCreate(channel: unknown): void {
    if (!this.isGuildChannelLike(channel)) return

    this.observe({
      guildId: channel.guild.id,
      channelId: channel.id,
      kind: 'channel_create',
      summary: `canal ${this.describeChannelType(channel.type)} criado: "${channel.name}"`,
      weight: 0.64,
    })
  }

  observeChannelDelete(channel: unknown): void {
    if (!this.isGuildChannelLike(channel)) return

    this.observe({
      guildId: channel.guild.id,
      channelId: channel.id,
      kind: 'channel_delete',
      summary: `canal ${this.describeChannelType(channel.type)} apagado: "${channel.name}"`,
      weight: 0.7,
    })
  }

  observeMemberJoin(member: GuildMember): void {
    if (member.user.bot) return

    this.observe({
      guildId: member.guild.id,
      userId: member.id,
      userName: member.displayName,
      kind: 'member_join',
      summary: `${member.displayName} entrou no servidor`,
      weight: 0.58,
    })
  }

  observeTrackStart(player: Player, track: Track): void {
    const voiceName = this.getChannelName(player.guildId, player.voiceChannelId)
    this.observe({
      guildId: player.guildId,
      channelId: player.textChannelId ?? player.voiceChannelId ?? undefined,
      kind: 'player_start',
      summary: `Mahina começou a tocar "${track.info.title}"${voiceName ? ` no voice "${voiceName}"` : ''}`,
      weight: 0.9,
    })
  }

  observeTrackEnd(player: Player, track: Track | null): void {
    this.observe({
      guildId: player.guildId,
      channelId: player.textChannelId ?? player.voiceChannelId ?? undefined,
      kind: 'player_end',
      summary: track?.info.title ? `música terminou: "${track.info.title}"` : 'música terminou',
      weight: 0.62,
    })
  }

  observeTrackError(
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: TrackExceptionEvent
  ): void {
    const cause = payload.exception?.message ?? 'erro desconhecido'
    this.observe({
      guildId: player.guildId,
      channelId: player.textChannelId ?? player.voiceChannelId ?? undefined,
      kind: 'player_error',
      summary: `erro ao tocar "${track?.info?.title ?? 'faixa desconhecida'}": ${cause.slice(0, 120)}`,
      weight: 0.86,
    })
  }

  observeQueueEnd(player: Player): void {
    this.observe({
      guildId: player.guildId,
      channelId: player.textChannelId ?? player.voiceChannelId ?? undefined,
      kind: 'queue_end',
      summary: 'fila de música terminou',
      weight: 0.76,
    })
  }

  observePlayerDisconnect(player: Player, voiceChannelId: string): void {
    const voiceName = this.getChannelName(player.guildId, voiceChannelId)
    this.observe({
      guildId: player.guildId,
      channelId: voiceChannelId,
      kind: 'player_disconnect',
      summary: `Mahina desconectou${voiceName ? ` do voice "${voiceName}"` : ' do voice'}`,
      weight: 0.86,
    })
  }

  getPromptContext(guildId: string, channelId: string, userId?: string): string {
    this.prune()

    const now = Date.now()
    const events = this.eventsByGuild.get(guildId) ?? []
    const relevantEvents = events
      .filter((event) => now - event.timestamp <= EVENT_TTL_MS)
      .map((event) => ({
        event,
        score:
          event.weight +
          (event.channelId === channelId ? 0.24 : 0) +
          (userId && event.userId === userId ? 0.28 : 0) +
          Math.exp(-(now - event.timestamp) / (10 * 60 * 1000)) * 0.34,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    const activeChannels = [...this.activityByChannel.values()]
      .filter((activity) => activity.guildId === guildId)
      .filter((activity) => now - activity.lastMessageAt <= ACTIVITY_TTL_MS)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      .slice(0, 5)

    if (relevantEvents.length === 0 && activeChannels.length === 0) return ''

    const parts = ['EVENTOS RECENTES DO SERVER:']

    for (const { event } of relevantEvents) {
      parts.push(`- ${this.relativeTime(event.timestamp)}: ${event.summary}`)
    }

    if (activeChannels.length > 0) {
      parts.push('ATIVIDADE RECENTE DE CHAT:')
      for (const activity of activeChannels) {
        const users = [...activity.users.values()].slice(-4).join(', ')
        parts.push(
          `- #${activity.channelName}: ${activity.count} mensagem(ns) nos últimos minutos${users ? `; pessoas: ${users}` : ''}`
        )
      }
    }

    parts.push(
      '- use esses eventos como memória operacional recente; se alguém acabou de entrar/mover/sair de voice ou a música mudou, aja ciente disso'
    )

    return parts.join('\n')
  }

  private observe(event: Omit<AwarenessEvent, 'timestamp'>): void {
    const events = this.eventsByGuild.get(event.guildId) ?? []
    events.push({
      ...event,
      summary: event.summary.replace(/\s+/g, ' ').trim().slice(0, MAX_SUMMARY_CHARS),
      timestamp: Date.now(),
    })

    this.eventsByGuild.set(event.guildId, events.slice(-MAX_EVENTS_PER_GUILD))
    this.pruneGuild(event.guildId)
  }

  private prune(): void {
    for (const guildId of this.eventsByGuild.keys()) {
      this.pruneGuild(guildId)
    }

    const now = Date.now()
    for (const [key, activity] of this.activityByChannel) {
      if (now - activity.lastMessageAt > ACTIVITY_TTL_MS) {
        this.activityByChannel.delete(key)
      }
    }
  }

  private pruneGuild(guildId: string): void {
    const now = Date.now()
    const events = this.eventsByGuild.get(guildId) ?? []
    this.eventsByGuild.set(
      guildId,
      events.filter((event) => now - event.timestamp <= EVENT_TTL_MS).slice(-MAX_EVENTS_PER_GUILD)
    )
  }

  private getChannelName(guildId: string, channelId?: string | null): string | undefined {
    if (!channelId) return undefined
    return this.client.guilds.cache.get(guildId)?.channels.cache.get(channelId)?.name
  }

  private relativeTime(timestamp: number): string {
    const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
    if (seconds < 60) return `${seconds}s atrás`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}min atrás`
    return `${Math.floor(minutes / 60)}h atrás`
  }

  private channelKey(guildId: string, channelId: string): string {
    return `${guildId}:${channelId}`
  }

  private describeChannelType(type: ChannelType): string {
    if (type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice) return 'de voz'
    if (type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement) return 'de texto'
    if (type === ChannelType.GuildCategory) return 'categoria'
    return 'do servidor'
  }

  private isGuildChannelLike(channel: unknown): channel is {
    id: string
    name: string
    type: ChannelType
    guild: { id: string }
  } {
    if (!channel || typeof channel !== 'object') return false

    const candidate = channel as {
      id?: unknown
      name?: unknown
      type?: unknown
      guild?: { id?: unknown } | null
    }

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.type === 'number' &&
      typeof candidate.guild?.id === 'string'
    )
  }
}

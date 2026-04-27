import type { Message } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'
import { logger } from '#common/logger'

interface ReflectionMessage {
  userId: string
  userName: string
  content: string
  timestamp: number
}

interface ReflectionSession {
  guildId: string
  guildName: string
  channelId: string
  channelName: string
  messages: ReflectionMessage[]
  lastMessageAt: number
  lastReflectionAt: number
}

const REFLECTION_INTERVAL_MS = 5 * 60 * 1000
const REFLECTION_IDLE_MS = 2 * 60 * 1000
const REFLECTION_MIN_GAP_MS = 12 * 60 * 1000
const MIN_SESSION_MESSAGES = 8
const MAX_SESSION_MESSAGES = 40
const MAX_BUFFER_MESSAGES = 80
const MAX_MESSAGE_CHARS = 500

export class MahinaReflectionService {
  private sessions = new Map<string, ReflectionSession>()
  private activeSessions = new Set<string>()
  private interval?: NodeJS.Timeout

  constructor(private client: MahinaBot) {}

  start(): void {
    if (this.interval) return

    this.interval = setInterval(() => {
      this.flushDueSessions().catch(() => {})
    }, REFLECTION_INTERVAL_MS)
    this.interval.unref?.()

    logger.info('MahinaReflectionService started')
  }

  stop(): void {
    if (!this.interval) return

    clearInterval(this.interval)
    this.interval = undefined
  }

  async observeMessage(message: Message): Promise<void> {
    if (message.author.bot || !message.guildId || !message.guild) return

    const content = this.cleanContent(message.content)
    if (content.length < 3) return

    const key = this.getSessionKey(message.guildId, message.channelId)
    const session =
      this.sessions.get(key) ??
      this.createSession(
        message.guildId,
        message.guild.name,
        message.channelId,
        this.getChannelName(message)
      )

    session.guildName = message.guild.name
    session.channelName = this.getChannelName(message)
    session.lastMessageAt = Date.now()
    session.messages.push({
      userId: message.author.id,
      userName: message.member?.displayName || message.author.username,
      content,
      timestamp: message.createdTimestamp,
    })

    if (session.messages.length > MAX_BUFFER_MESSAGES) {
      session.messages = session.messages.slice(-MAX_BUFFER_MESSAGES)
    }

    this.sessions.set(key, session)

    if (session.messages.length >= MAX_SESSION_MESSAGES) {
      await this.reflectSession(key)
    }
  }

  private async flushDueSessions(): Promise<void> {
    const now = Date.now()

    for (const [key, session] of this.sessions) {
      if (session.messages.length < MIN_SESSION_MESSAGES) continue
      if (now - session.lastMessageAt < REFLECTION_IDLE_MS) continue
      if (
        session.lastReflectionAt > 0 &&
        now - session.lastReflectionAt < REFLECTION_MIN_GAP_MS &&
        session.messages.length < MAX_SESSION_MESSAGES
      ) {
        continue
      }

      await this.reflectSession(key)
    }
  }

  private async reflectSession(key: string): Promise<void> {
    if (this.activeSessions.has(key)) return

    const session = this.sessions.get(key)
    const brain = this.client.services.brain
    if (!session || !brain || session.messages.length < MIN_SESSION_MESSAGES) return

    this.activeSessions.add(key)
    try {
      const messages = session.messages.slice(-MAX_SESSION_MESSAGES)
      const stored = await brain.reflectOnSession({
        guildId: session.guildId,
        guildName: session.guildName,
        channelId: session.channelId,
        channelName: session.channelName,
        messages,
      })

      if (stored > 0) {
        session.lastReflectionAt = Date.now()
        session.messages = session.messages.slice(-3)
        logger.debug(
          `MahinaReflectionService: stored ${stored} memories for #${session.channelName}`
        )
      }
    } catch (error) {
      logger.debug(`MahinaReflectionService: reflection failed (${String(error)})`)
    } finally {
      this.activeSessions.delete(key)
    }
  }

  private createSession(
    guildId: string,
    guildName: string,
    channelId: string,
    channelName: string
  ): ReflectionSession {
    return {
      guildId,
      guildName,
      channelId,
      channelName,
      messages: [],
      lastMessageAt: Date.now(),
      lastReflectionAt: 0,
    }
  }

  private getSessionKey(guildId: string, channelId: string): string {
    return `${guildId}:${channelId}`
  }

  private getChannelName(message: Message): string {
    const channel = message.channel
    return 'name' in channel && typeof channel.name === 'string' ? channel.name : message.channelId
  }

  private cleanContent(content: string): string {
    return content.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_CHARS)
  }
}

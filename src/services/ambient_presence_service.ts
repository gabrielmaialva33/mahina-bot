import {
  ActivityType,
  ChannelType,
  EmbedBuilder,
  GuildMember,
  type Message,
  type TextChannel,
} from 'discord.js'
import { logger } from '#common/logger'
import type MahinaBot from '#common/mahina_bot'

type PresenceMood = 'social' | 'music' | 'chaos' | 'tech' | 'visual'

const REACTION_COOLDOWN_MS = 90_000
const PRESENCE_INTERVAL_MS = 15 * 60 * 1000
const RITUAL_INTERVAL_MS = 6 * 60 * 60 * 1000

export class AmbientPresenceService {
  private reactionCooldown = new Map<string, number>()
  private presenceInterval: NodeJS.Timeout | null = null
  private ritualInterval: NodeJS.Timeout | null = null
  private ritualCooldown = new Map<string, number>()
  private milestoneCooldown = new Map<string, number>()
  private readonly messageMilestones = [50, 150, 300, 500, 1000]

  constructor(private client: MahinaBot) {}

  start(): void {
    if (this.presenceInterval) return

    this.presenceInterval = setInterval(() => {
      this.updateDynamicPresence().catch((error) => {
        logger.debug(`Ambient presence update failed: ${String(error)}`)
      })
    }, PRESENCE_INTERVAL_MS)

    this.ritualInterval = setInterval(() => {
      this.runSocialRituals().catch((error) => {
        logger.debug(`Ambient social ritual failed: ${String(error)}`)
      })
    }, RITUAL_INTERVAL_MS)
  }

  stop(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval)
      this.presenceInterval = null
    }
    if (this.ritualInterval) {
      clearInterval(this.ritualInterval)
      this.ritualInterval = null
    }
  }

  async maybeReactToMessage(message: Message): Promise<void> {
    if (!message.guildId || !message.inGuild() || message.author.bot || !message.content.trim())
      return

    const cooldownKey = `${message.guildId}:${message.channelId}`
    const lastReaction = this.reactionCooldown.get(cooldownKey) ?? 0
    if (Date.now() - lastReaction < REACTION_COOLDOWN_MS) return

    const lower = message.content.toLowerCase()
    let emoji: string | null = null
    let chance = 0

    if (/mahina/i.test(lower)) {
      emoji = '👀'
      chance = 0.65
    } else if (/kkkk|kkk|vsf|pqp|caralho|porra/i.test(lower)) {
      emoji = '💀'
      chance = 0.2
    } else if (/music|m[uú]sica|som|spotify|playlist|play\b/i.test(lower)) {
      emoji = '🎵'
      chance = 0.2
    } else if (/docker|bug|erro|api|code|prisma|redis|stack/i.test(lower)) {
      emoji = '🛠️'
      chance = 0.16
    } else if (/meme|imagem|foto|print|olha isso/i.test(lower) || message.attachments.size > 0) {
      emoji = '🖼️'
      chance = 0.18
    } else if (/[!?]{2,}|[A-Z]{5,}/.test(message.content)) {
      emoji = '😵'
      chance = 0.12
    }

    if (!emoji || Math.random() > chance) return

    try {
      await message.react(emoji)
      this.reactionCooldown.set(cooldownKey, Date.now())
    } catch {
      // ignore missing perms or unknown emoji support
    }
  }

  async maybeCelebrateActivity(message: Message): Promise<void> {
    if (!message.guildId || !message.inGuild() || message.author.bot) return
    if (!('send' in message.channel) || !message.channel.isTextBased()) return

    const pulse = await this.client.services.serverLearning?.getSocialPulseSnapshot(
      message.guildId,
      message.channelId,
      message.author.id
    )
    if (!pulse) return

    const channelKey = `${message.guildId}:${message.channelId}`
    const lastMilestone = this.milestoneCooldown.get(channelKey) ?? 0
    if (Date.now() - lastMilestone < 90 * 60 * 1000) return

    const observationCount = pulse.recentSummaries.length
    const target = this.messageMilestones.find((milestone) => milestone <= observationCount)
    if (!target || observationCount !== target) return

    const relationshipNote = pulse.relationship?.nickname
      ? `inclusive, eu já tô chamando <@${message.author.id}> de ${pulse.relationship.nickname}.`
      : 'já deu pra sacar bem a energia desse povo.'

    await message.channel
      .send({
        content: `marco social batido por aqui: ${target} sinais recentes lidos nesse canal. ${relationshipNote}`,
      })
      .catch(() => {})

    this.milestoneCooldown.set(channelKey, Date.now())
    await this.client.services.mahinaWill?.markSpoke(message.guildId, message.channelId)
  }

  async updateDynamicPresence(): Promise<void> {
    const user = this.client.user
    if (!user) return

    const snapshot = await this.getPresenceSnapshot()
    user.setPresence({
      activities: [{ name: snapshot.name, type: snapshot.type }],
      status: this.client.env.BOT_STATUS as never,
    })
  }

  async sendMemberWelcome(member: GuildMember): Promise<void> {
    const channel = await this.getPreferredSocialChannel(member.guild.id)
    if (!channel) return
    const guildProfile = await this.client.db.getGuildStyleProfile(member.guild.id)
    const styleHint = this.getStyleHint(guildProfile?.data)

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle(`qual foi ${member.displayName}, cola aí`)
      .setDescription(this.buildWelcomeDescription(member, styleHint))
      .setFooter({
        text: `a Mahina já sacou a vibe${styleHint ? ` · ${styleHint}` : ''}`,
        iconURL: this.client.user?.displayAvatarURL(),
      })

    await channel.send({ embeds: [embed] }).catch(() => {})
    await this.client.services.mahinaWill?.markSpoke(member.guild.id, channel.id)
  }

  async sendChannelSpark(channel: TextChannel): Promise<void> {
    if (channel.type !== ChannelType.GuildText) return
    const guildProfile = await this.client.db.getGuildStyleProfile(channel.guildId)
    const message = this.buildChannelSparkMessage(
      channel.name,
      this.getStyleHint(guildProfile?.data)
    )
    await channel.send({ content: message }).catch(() => {})
    await this.client.services.mahinaWill?.markSpoke(channel.guildId, channel.id)
  }

  private async getPresenceSnapshot(): Promise<{ name: string; type: ActivityType }> {
    const player =
      this.client.runtime.music && this.client.env.GUILD_ID
        ? this.client.manager.getPlayer(this.client.env.GUILD_ID)
        : undefined

    if (player?.queue.current) {
      return {
        name: `🎶 ${player.queue.current.info.title}`,
        type: ActivityType.Listening,
      }
    }

    const mood = await this.detectDominantPresenceMood()

    switch (mood) {
      case 'music':
        return { name: 'mó vibe de som por aqui', type: ActivityType.Playing }
      case 'tech':
        return { name: 'debugando a alma do server', type: ActivityType.Playing }
      case 'visual':
        return { name: 'de olho nos memes e prints', type: ActivityType.Watching }
      case 'chaos':
        return { name: 'observando o caos do chat', type: ActivityType.Watching }
      default:
        return { name: 'sentindo o clima do server', type: ActivityType.Watching }
    }
  }

  private async detectDominantPresenceMood(): Promise<PresenceMood> {
    const guildIds = this.client.guilds.cache.map((guild) => guild.id).slice(0, 8)
    const profiles = await Promise.all(
      guildIds.map((guildId) => this.client.db.getGuildStyleProfile(guildId))
    )

    let music = 0
    let tech = 0
    let visual = 0
    let chaos = 0

    for (const profile of profiles) {
      const data = profile?.data
      if (!data || typeof data !== 'object' || Array.isArray(data)) continue
      const recurringTopics =
        (data as { recurringTopics?: Record<string, number> }).recurringTopics || {}
      const toneTags = (data as { toneTags?: Record<string, number> }).toneTags || {}

      for (const [topic, count] of Object.entries(recurringTopics)) {
        if (/music|m[uú]sica|spotify|playlist|song/i.test(topic)) music += count
        if (/docker|bug|code|api|redis|prisma|erro/i.test(topic)) tech += count
        if (/imagem|foto|meme|print|visual/i.test(topic)) visual += count
      }

      chaos += (toneTags.caotico || 0) + (toneTags.energia_alta || 0) + (toneTags.memeiro || 0)
      visual += toneTags.visual || 0
      music += toneTags.musical || 0
      tech += toneTags.tecnico || 0
    }

    const pairs: Array<[PresenceMood, number]> = [
      ['music', music],
      ['tech', tech],
      ['visual', visual],
      ['chaos', chaos],
      ['social', 1],
    ]

    pairs.sort(([, a], [, b]) => b - a)
    return pairs[0][0]
  }

  private async getPreferredSocialChannel(guildId: string): Promise<TextChannel | null> {
    const guild = this.client.guilds.cache.get(guildId)
    if (!guild) return null

    const aiConfig = await this.client.db.getAIConfig(guildId)
    const candidateIds = aiConfig.allowedChannels?.length
      ? aiConfig.allowedChannels
      : guild.channels.cache
          .filter((channel) => channel.type === ChannelType.GuildText)
          .map((channel) => channel.id)

    for (const channelId of candidateIds) {
      const channel = guild.channels.cache.get(channelId)
      if (
        channel &&
        channel.type === ChannelType.GuildText &&
        channel.permissionsFor(this.client.user!)?.has(['SendMessages', 'ViewChannel'])
      ) {
        return channel as TextChannel
      }
    }

    return null
  }

  private async runSocialRituals(): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      const channel = await this.getPreferredSocialChannel(guild.id)
      if (!channel) continue

      const cooldownKey = `${guild.id}:${channel.id}`
      const lastRitual = this.ritualCooldown.get(cooldownKey) ?? 0
      if (Date.now() - lastRitual < 18 * 60 * 60 * 1000) continue

      const socialPulse = await this.client.services.serverLearning?.getSocialPulseSnapshot(
        guild.id,
        channel.id
      )
      const willSnapshot = await this.client.services.mahinaWill?.getStateSnapshot(
        guild.id,
        channel.id
      )

      if (!socialPulse || socialPulse.recentSummaries.length < 3) continue

      const embed = new EmbedBuilder()
        .setColor(this.client.config.color.main)
        .setTitle('🌙 Ritual social da Mahina')
        .setDescription('passei o olho no clima daqui e ficou esse retrato do momento:')
        .addFields(
          {
            name: '🌆 Vibe do server',
            value:
              socialPulse.guildVibe.length > 0
                ? socialPulse.guildVibe.join(', ')
                : 'ainda entendendo melhor',
            inline: false,
          },
          {
            name: '🎯 Foco do canal',
            value:
              socialPulse.channelFocus.length > 0
                ? socialPulse.channelFocus.join(', ')
                : 'sem assunto dominante agora',
            inline: false,
          },
          {
            name: '🧠 Cabeça da Mahina',
            value: willSnapshot
              ? `humor: ${willSnapshot.mood}\nfixações: ${willSnapshot.currentFixations.slice(0, 3).join(', ') || 'nenhuma forte'}`
              : 'quietinha e observando',
            inline: false,
          },
          {
            name: '📝 Sinais recentes',
            value: socialPulse.recentSummaries
              .slice(0, 3)
              .map((item) => `• ${item}`)
              .join('\n'),
            inline: false,
          }
        )
        .setFooter({
          text: 'Mahina ritual social',
          iconURL: this.client.user?.displayAvatarURL(),
        })

      await channel.send({ embeds: [embed] }).catch(() => {})
      this.ritualCooldown.set(cooldownKey, Date.now())
      await this.client.services.mahinaWill?.markSpoke(guild.id, channel.id)
    }
  }

  private buildWelcomeDescription(member: GuildMember, styleHint: string | null): string {
    const baseLines = [
      `chegou gente nova em ${member.guild.name}.`,
      'entra no clima, pega as piadas internas no ar e não mosca.',
    ]

    if (styleHint) {
      baseLines.push(`dica rápida: a vibe daqui é ${styleHint}.`)
    } else {
      baseLines.push('observa dois minutos e você já entende o nível do caos.')
    }

    return baseLines.join('\n')
  }

  private buildChannelSparkMessage(channelName: string, styleHint: string | null): string {
    if (styleHint) {
      return `canal novo, ${channelName}.\nvamos ver se isso vira ${styleHint} ou só mais um canto do caos.`
    }

    return `canal novo, ${channelName}.\nquero ver quanto tempo leva pra isso aqui ganhar personalidade própria.`
  }

  private getStyleHint(data: unknown): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null
    }

    const toneTags = (data as { toneTags?: Record<string, number> }).toneTags || {}
    const recurringTopics =
      (data as { recurringTopics?: Record<string, number> }).recurringTopics || {}

    const topTone = Object.entries(toneTags).sort(([, a], [, b]) => b - a)[0]?.[0]
    const topTopic = Object.entries(recurringTopics).sort(([, a], [, b]) => b - a)[0]?.[0]

    if (topTone && topTopic) {
      return `${topTone.replaceAll('_', ' ')} e ${topTopic}`
    }

    if (topTone) {
      return topTone.replaceAll('_', ' ')
    }

    if (topTopic) {
      return topTopic
    }

    return null
  }
}

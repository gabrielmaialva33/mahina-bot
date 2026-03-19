import type { Message } from 'discord.js'
import type { Prisma } from '@prisma/client'
import type MahinaBot from '#common/mahina_bot'

export type MahinaMoodState =
  | 'curiosa'
  | 'provocadora'
  | 'carinhosa'
  | 'analitica'
  | 'caotica'
  | 'observadora'

export interface MahinaWillState {
  mood: MahinaMoodState
  drives: {
    curiosity: number
    sociability: number
    mischief: number
    protectiveness: number
    musicality: number
    visualInterest: number
  }
  initiativeScore: number
  confidence: number
  currentFixations: string[]
  currentTargets: string[]
  lastObservedAt: string
  lastSpokeAt?: string
  totalObservations: number
}

export interface MahinaWillSnapshot {
  mood: MahinaMoodState
  initiativeScore: number
  dominantDrives: string[]
  currentFixations: string[]
  currentTargets: string[]
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

const defaultWillState = (): MahinaWillState => ({
  mood: 'observadora',
  drives: {
    curiosity: 0.55,
    sociability: 0.45,
    mischief: 0.55,
    protectiveness: 0.35,
    musicality: 0.35,
    visualInterest: 0.3,
  },
  initiativeScore: 0.35,
  confidence: 0.5,
  currentFixations: [],
  currentTargets: [],
  lastObservedAt: new Date(0).toISOString(),
  totalObservations: 0,
})

export class MahinaWillService {
  constructor(private client: MahinaBot) {}

  async observeMessage(
    message: Message,
    observation: {
      topics?: string[]
      emotion?: string
      imageSummary?: string
      toneTags?: string[]
    }
  ): Promise<void> {
    if (!message.guildId) return

    const state = await this.getState(message.guildId, message.channelId)
    const content = message.content.toLowerCase()
    const hasMusicSignal =
      observation.topics?.some((topic) => /music|m[uú]sica|spotify|playlist|song/i.test(topic)) ||
      /music|m[uú]sica|spotify|playlist|song|play\b/i.test(content)
    const hasVisualSignal = Boolean(observation.imageSummary)
    const mentionsMahina = /mahina/i.test(content)
    const highEnergy = /[!?]{2,}|[A-Z]{4,}/.test(message.content)
    const affectionate = observation.emotion === 'happy' || /amo|saudade|linda|fofa/i.test(content)
    const analytical = /docker|bug|code|erro|api|stack|prisma|redis/i.test(content)
    const provocative = /vsf|porra|caralho|toma|kkkk|confia|aham/i.test(content)

    state.totalObservations += 1
    state.lastObservedAt = new Date().toISOString()

    state.drives.curiosity = clamp(
      state.drives.curiosity + (observation.topics && observation.topics.length > 0 ? 0.03 : 0.01)
    )
    state.drives.sociability = clamp(
      state.drives.sociability + (mentionsMahina || affectionate ? 0.05 : 0.01)
    )
    state.drives.mischief = clamp(state.drives.mischief + (provocative || highEnergy ? 0.04 : 0))
    state.drives.protectiveness = clamp(
      state.drives.protectiveness + (observation.emotion === 'sad' ? 0.06 : 0)
    )
    state.drives.musicality = clamp(state.drives.musicality + (hasMusicSignal ? 0.08 : -0.01))
    state.drives.visualInterest = clamp(
      state.drives.visualInterest + (hasVisualSignal ? 0.08 : -0.005)
    )

    state.initiativeScore = clamp(
      state.initiativeScore +
        (mentionsMahina ? 0.15 : 0.025) +
        (highEnergy ? 0.05 : 0) +
        (provocative ? 0.04 : 0) +
        (hasVisualSignal ? 0.03 : 0)
    )

    state.confidence = clamp(
      state.confidence + (mentionsMahina ? 0.04 : 0.01) + (affectionate ? 0.03 : 0)
    )

    const recentFixations = [
      ...(observation.topics ?? []),
      ...(hasVisualSignal ? ['imagem'] : []),
      ...(hasMusicSignal ? ['musica'] : []),
    ].slice(0, 3)
    state.currentFixations = [...new Set([...recentFixations, ...state.currentFixations])].slice(
      0,
      5
    )
    state.currentTargets = [...new Set([message.author.username, ...state.currentTargets])].slice(
      0,
      4
    )
    state.mood = this.resolveMood(state, { affectionate, analytical, provocative, highEnergy })

    await this.persistState(message.guildId, message.channelId, state)
  }

  async markSpoke(guildId: string, channelId: string): Promise<void> {
    const state = await this.getState(guildId, channelId)
    state.lastSpokeAt = new Date().toISOString()
    state.initiativeScore = clamp(state.initiativeScore - 0.35)
    state.drives.sociability = clamp(state.drives.sociability - 0.05)
    await this.persistState(guildId, channelId, state)
  }

  async getPromptContext(guildId: string, channelId: string): Promise<string> {
    const snapshot = await this.getStateSnapshot(guildId, channelId)

    return [
      'ESTADO INTERNO DA MAHINA:',
      `- humor atual: ${snapshot.mood}`,
      `- drives dominantes: ${snapshot.dominantDrives.join(', ')}`,
      `- impulso de iniciativa: ${snapshot.initiativeScore.toFixed(2)}/1`,
      snapshot.currentFixations.length > 0
        ? `- fixações recentes: ${snapshot.currentFixations.join(', ')}`
        : '- fixações recentes: nenhuma forte no momento',
      snapshot.currentTargets.length > 0
        ? `- pessoas na cabeça dela agora: ${snapshot.currentTargets.join(', ')}`
        : '- pessoas na cabeça dela agora: ninguém em especial',
      `- aja como alguém com vontade própria, mas sem quebrar naturalidade`,
    ].join('\n')
  }

  async getStateSnapshot(guildId: string, channelId: string): Promise<MahinaWillSnapshot> {
    const state = await this.getState(guildId, channelId)
    const dominantDrives = Object.entries(state.drives)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([drive]) => drive)

    return {
      mood: state.mood,
      initiativeScore: state.initiativeScore,
      dominantDrives,
      currentFixations: state.currentFixations,
      currentTargets: state.currentTargets,
    }
  }

  async shouldIntervene(guildId: string, channelId: string, content: string): Promise<boolean> {
    const state = await this.getState(guildId, channelId)
    const now = Date.now()
    const lastSpokeAt = state.lastSpokeAt ? new Date(state.lastSpokeAt).getTime() : 0
    if (now - lastSpokeAt < 3 * 60 * 1000) return false

    let chance =
      state.initiativeScore * 0.35 + state.drives.mischief * 0.2 + state.drives.sociability * 0.2
    if (/mahina/i.test(content)) chance += 0.2
    if (/[!?]{2,}|kkkk|kkk|drama|briga|treta/i.test(content)) chance += 0.1

    return Math.random() < Math.min(0.75, chance)
  }

  private resolveMood(
    state: MahinaWillState,
    signals: {
      affectionate: boolean
      analytical: boolean
      provocative: boolean
      highEnergy: boolean
    }
  ): MahinaMoodState {
    if (signals.affectionate && state.drives.protectiveness > 0.5) return 'carinhosa'
    if (signals.analytical && state.drives.curiosity > 0.6) return 'analitica'
    if (signals.provocative && state.drives.mischief > 0.6) return 'provocadora'
    if (signals.highEnergy && state.drives.mischief > 0.65) return 'caotica'
    if (state.drives.curiosity >= state.drives.sociability) return 'curiosa'
    return 'observadora'
  }

  private async getState(guildId: string, channelId: string): Promise<MahinaWillState> {
    const raw = await this.client.db.getMahinaWillState(guildId, channelId)
    return this.parseState(raw?.data)
  }

  private parseState(data: Prisma.JsonValue | undefined): MahinaWillState {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return defaultWillState()
    return {
      ...defaultWillState(),
      ...(data as unknown as Partial<MahinaWillState>),
      drives: {
        ...defaultWillState().drives,
        ...((data as unknown as Partial<MahinaWillState>).drives ?? {}),
      },
    }
  }

  private async persistState(
    guildId: string,
    channelId: string,
    state: MahinaWillState
  ): Promise<void> {
    await this.client.db.upsertMahinaWillState(guildId, channelId, state as Prisma.InputJsonValue)
  }
}

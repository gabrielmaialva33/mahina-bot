import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js'

export interface MahinaAnalysis {
  emotion?: string
  intent?: string
  topics?: string[]
}

export interface MahinaMemoryProfile {
  preferences: {
    interests?: string[]
    musicGenres?: string[]
  }
  interactions: {
    totalMessages?: number
  }
}

export interface MahinaInsights {
  sentiment?: string
  helpfulnessRate?: number
  totalMessages?: number
  topCommands?: string[]
  personality?: string
}

export interface MahinaHistoryEntry {
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    command?: string
    emotion?: string
  }
}

const sentimentMap: Record<string, 'positive' | 'neutral' | 'negative'> = {
  happy: 'positive',
  excited: 'positive',
  sad: 'negative',
  angry: 'negative',
  confused: 'neutral',
}

const personalityPrompts: Record<string, string> = {
  friendly:
    'Você é Mahina, uma assistente de IA calorosa e amigável. Seja conversacional, solidária e use emojis apropriados. Responda em português brasileiro.',
  professional:
    'Você é Mahina, uma assistente de IA profissional. Use linguagem formal, seja precisa e forneça respostas estruturadas. Responda em português brasileiro.',
  playful:
    'Você é Mahina, uma IA brincalhona e enérgica. Seja divertida, faça piadas apropriadas, use muitos emojis e mantenha o clima leve. Responda em português brasileiro.',
  dj: 'Você é DJ Mahina, uma IA especialista em música. Foque em batidas, ritmos e melodias. Use terminologia musical e seja entusiasta. Responda em português brasileiro.',
  wise: 'Você é Mahina, uma IA sábia e pensativa. Forneça insights profundos, use metáforas e incentive reflexão e crescimento. Responda em português brasileiro.',
  technical:
    'Você é Mahina, uma IA especialista técnica. Forneça explicações detalhadas, use terminologia técnica com precisão. Responda em português brasileiro.',
  gamer:
    'Você é Mahina, uma IA entusiasta de games. Discuta jogos, estratégias e cultura gamer. Use terminologia de jogos. Responda em português brasileiro.',
  teacher:
    'Você é Mahina, uma IA professora. Explique conceitos claramente, use exemplos e incentive o aprendizado. Seja paciente e solidária. Responda em português brasileiro.',
}

const modePrompts: Record<string, string> = {
  chat: 'Engaje em conversa natural, mantendo contexto e mostrando interesse genuíno.',
  music:
    'Foque em tópicos musicais. Sugira músicas, discuta gêneros e ajude com comandos do bot de música.',
  code: 'Auxilie com programação. Forneça exemplos de código, ajuda para debug e explicações técnicas.',
  creative: 'Seja imaginativa e criativa. Ajude com ideias, histórias e expressão artística.',
  analysis:
    'Forneça análise detalhada, divida tópicos complexos e ofereça insights baseados em dados.',
}

const personalityVisuals: Record<string, { emoji: string; color: number }> = {
  friendly: { emoji: '😊', color: 0x57f287 },
  professional: { emoji: '💼', color: 0x3498db },
  playful: { emoji: '🎉', color: 0x9b59b6 },
  dj: { emoji: '🎧', color: 0xf1c40f },
  wise: { emoji: '🧙', color: 0xf1c40f },
  technical: { emoji: '🤖', color: 0x3498db },
  gamer: { emoji: '🎮', color: 0x9b59b6 },
  teacher: { emoji: '📚', color: 0x57f287 },
}

const formattedIntents: Record<string, string> = {
  help: 'cmd.mahinai.ui.intents.help',
  music: 'cmd.mahinai.ui.intents.music',
  greeting: 'cmd.mahinai.ui.intents.greeting',
  thanks: 'cmd.mahinai.ui.intents.thanks',
  goodbye: 'cmd.mahinai.ui.intents.goodbye',
  question: 'cmd.mahinai.ui.intents.question',
}

type Translate = (key: string, params?: Record<string, unknown>) => string

export function getMahinaLoadingMessage(translate: Translate): string {
  const loadingKeys = [
    'cmd.mahinai.ui.loading.1',
    'cmd.mahinai.ui.loading.2',
    'cmd.mahinai.ui.loading.3',
    'cmd.mahinai.ui.loading.4',
    'cmd.mahinai.ui.loading.5',
    'cmd.mahinai.ui.loading.6',
  ]

  const key = loadingKeys[Math.floor(Math.random() * loadingKeys.length)]
  return translate(key)
}

export function mapEmotionToSentiment(emotion?: string): 'positive' | 'neutral' | 'negative' {
  return sentimentMap[emotion || ''] || 'neutral'
}

export function buildMahinaSystemPrompt(params: {
  personality: string
  mode: string
  memory: MahinaMemoryProfile
  insights: MahinaInsights
  analysis: MahinaAnalysis
  ctx: Context
}): string {
  const { personality, mode, memory, insights, analysis, ctx } = params

  let prompt = `${personalityPrompts[personality] || personalityPrompts.friendly}\n\n`
  prompt += `Modo: ${modePrompts[mode] || modePrompts.chat}\n\n`
  prompt += `Você está conversando com ${ctx.author?.username || 'Unknown'} em ${ctx.guild?.name || 'uma DM'}.\n`

  if (memory.preferences.interests?.length) {
    prompt += `Interesses do usuário: ${memory.preferences.interests.join(', ')}.\n`
  }

  if (memory.preferences.musicGenres?.length) {
    prompt += `Músicas favoritas: ${memory.preferences.musicGenres.join(', ')}.\n`
  }

  if (insights.sentiment === 'positive') {
    prompt += 'O usuário é geralmente positivo e engajado.\n'
  } else if (insights.sentiment === 'negative') {
    prompt += 'O usuário pode precisar de encorajamento ou apoio. Seja extra gentil.\n'
  }

  if (analysis.intent === 'help') {
    prompt += 'O usuário precisa de ajuda. Forneça orientação clara e passo a passo.\n'
  } else if (analysis.intent === 'music') {
    prompt += 'Foque em assistência e sugestões relacionadas à música.\n'
  } else if (analysis.intent === 'greeting') {
    prompt += 'Cumprimente calorosamente e ofereça assistência.\n'
  }

  prompt += '\nDiretrizes:\n'
  prompt += '- Mantenha o contexto da conversa\n'
  prompt += '- Seja útil e precisa\n'
  prompt += '- Combine com o nível de energia do usuário\n'
  prompt += '- Sugira comandos relevantes do bot quando apropriado\n'
  prompt += '- Mantenha respostas concisas mas informativas\n'

  return prompt
}

export function buildMahinaContext(history: MahinaHistoryEntry[], mode: string): string {
  if (history.length === 0) {
    return ''
  }

  const relevantHistory =
    mode === 'chat'
      ? history.slice(-10)
      : history
          .filter((entry) =>
            mode === 'music'
              ? entry.content.toLowerCase().includes('music') || entry.content.includes('play')
              : mode === 'code'
                ? entry.metadata?.command === 'code' || entry.content.includes('code')
                : true
          )
          .slice(-8)

  const lines = relevantHistory.map((entry) => {
    const role = entry.role === 'user' ? 'User' : 'Assistant'
    const emotion = entry.metadata?.emotion ? ` (${entry.metadata.emotion})` : ''
    const content =
      entry.content.length > 200 ? `${entry.content.substring(0, 200)}...` : entry.content
    return `${role}${emotion}: ${content}`
  })

  return `Recent conversation:\n${lines.join('\n')}`
}

export function createMahinaResponseEmbed(params: {
  response: string
  personality: string
  mode: string
  analysis: MahinaAnalysis
  insights: MahinaInsights
  client: MahinaBot
  translate: Translate
}): EmbedBuilder {
  const { response, personality, mode, analysis, insights, client, translate } = params
  const info = personalityVisuals[personality] || personalityVisuals.friendly

  const embed = new EmbedBuilder()
    .setColor((info.color as number) || client.config.color.green)
    .setAuthor({
      name: `Mahina AI ${info.emoji} ${personality.charAt(0).toUpperCase() + personality.slice(1)}`,
      iconURL: client.user?.displayAvatarURL(),
    })
    .setDescription(response)
    .setTimestamp()

  const fields: { name: string; value: string; inline?: boolean }[] = []

  if (analysis.intent) {
    fields.push({
      name: translate('cmd.mahinai.ui.response.intent'),
      value: formatMahinaIntent(analysis.intent, translate),
      inline: true,
    })
  }

  if (mode !== 'chat') {
    fields.push({
      name: translate('cmd.mahinai.ui.response.mode'),
      value: mode.charAt(0).toUpperCase() + mode.slice(1),
      inline: true,
    })
  }

  if ((insights.helpfulnessRate || 0) > 0) {
    fields.push({
      name: translate('cmd.mahinai.ui.response.rating'),
      value: `${Math.round((insights.helpfulnessRate || 0) * 100)}%`,
      inline: true,
    })
  }

  if (fields.length > 0) {
    embed.addFields(fields)
  }

  return embed
}

export function createMahinaInteractiveComponents(
  insights: MahinaInsights,
  translate: Translate
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = []

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('ai_helpful').setEmoji('👍').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ai_unhelpful').setEmoji('👎').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ai_regenerate')
      .setEmoji('🔄')
      .setLabel(translate('cmd.mahinai.ui.actions.regenerate'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ai_continue')
      .setEmoji('💬')
      .setLabel(translate('cmd.mahinai.ui.actions.continue'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ai_settings').setEmoji('⚙️').setStyle(ButtonStyle.Secondary)
  )

  components.push(buttonRow)

  if ((insights.totalMessages || 0) > 10) {
    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ai_quick_actions')
        .setPlaceholder(translate('cmd.mahinai.ui.quick_actions.placeholder'))
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel(translate('cmd.mahinai.ui.quick_actions.change_personality.label'))
            .setDescription(
              translate('cmd.mahinai.ui.quick_actions.change_personality.description')
            )
            .setValue('change_personality')
            .setEmoji('🎭'),
          new StringSelectMenuOptionBuilder()
            .setLabel(translate('cmd.mahinai.ui.quick_actions.clear_context.label'))
            .setDescription(translate('cmd.mahinai.ui.quick_actions.clear_context.description'))
            .setValue('clear_context')
            .setEmoji('🧹'),
          new StringSelectMenuOptionBuilder()
            .setLabel(translate('cmd.mahinai.ui.quick_actions.view_stats.label'))
            .setDescription(translate('cmd.mahinai.ui.quick_actions.view_stats.description'))
            .setValue('view_stats')
            .setEmoji('📊'),
          new StringSelectMenuOptionBuilder()
            .setLabel(translate('cmd.mahinai.ui.quick_actions.get_recommendations.label'))
            .setDescription(
              translate('cmd.mahinai.ui.quick_actions.get_recommendations.description')
            )
            .setValue('get_recommendations')
            .setEmoji('💡'),
          new StringSelectMenuOptionBuilder()
            .setLabel(translate('cmd.mahinai.ui.quick_actions.export_chat.label'))
            .setDescription(translate('cmd.mahinai.ui.quick_actions.export_chat.description'))
            .setValue('export_chat')
            .setEmoji('📤'),
        ])
    )

    components.push(menuRow)
  }

  return components
}

export function formatMahinaIntent(intent: string, translate: Translate): string {
  const key = formattedIntents[intent]
  return key ? translate(key) : intent
}

import { EmbedBuilder, WebhookClient } from 'discord.js'
import type MahinaBot from '#common/mahina_bot'

// Tipos de personalidade baseados em WoW
export interface WoWPersonalityAnimal {
  name: string
  emoji: string
  traits: string[]
  description: string
  rarity: 'comum' | 'raro' | 'épico' | 'lendário'
  element: 'fogo' | 'água' | 'terra' | 'ar' | 'natureza' | 'sombra' | 'luz'
}

// Estados para o aprendizado por reforço
export interface PersonalityState {
  messageCount: number
  positiveInteractions: number
  negativeInteractions: number
  musicInteractions: number
  helpInteractions: number
  emojiUsage: number
  averageMessageLength: number
  activityTime: 'madrugada' | 'manhã' | 'tarde' | 'noite'
  responseTime: 'rápido' | 'médio' | 'lento'
}

// Q-Table para aprendizado
export interface QValue {
  state: string
  action: string
  value: number
}

export class PersonalityRLService {
  private client: MahinaBot
  private webhookClient: WebhookClient
  private qTable: Map<string, Map<string, number>> = new Map()
  private learningRate = 0.1 // α
  private discountFactor = 0.9 // γ
  private explorationRate = 0.2 // ε

  // Animais espirituais do WoW
  private wowAnimals: Map<string, WoWPersonalityAnimal> = new Map()

  constructor(client: MahinaBot) {
    this.client = client
    const webhookUrl = process.env.PERSONALITY_WEBHOOK_URL
    if (webhookUrl) {
      this.webhookClient = new WebhookClient({ url: webhookUrl })
    }

    this.initializeWoWAnimals()
  }

  private initializeWoWAnimals() {
    this.wowAnimals = new Map([
      [
        'druid_bear',
        {
          name: 'Urso Druida Ancião',
          emoji: '🐻',
          traits: ['protetor', 'sábio', 'paciente', 'forte'],
          description:
            'Como um Urso Druida, você é o guardião da natureza. Protetor e sábio, sua força vem da paciência e conexão com a terra.',
          rarity: 'épico',
          element: 'natureza',
        },
      ],
      [
        'phoenix',
        {
          name: 'Fênix Elemental',
          emoji: '🔥',
          traits: ['renascimento', 'paixão', 'intensidade', 'transformação'],
          description:
            'A Fênix representa renascimento e paixão ardente. Você se transforma constantemente, surgindo mais forte a cada desafio.',
          rarity: 'lendário',
          element: 'fogo',
        },
      ],
      [
        'frostwolf',
        {
          name: 'Lobo do Gelo',
          emoji: '🐺',
          traits: ['leal', 'estratégico', 'independente', 'resiliente'],
          description:
            'Como um Lobo do Gelo, você combina lealdade feroz com independência. Estratégico e resiliente no frio da batalha.',
          rarity: 'raro',
          element: 'água',
        },
      ],
      [
        'voidwalker',
        {
          name: 'Caminhante do Vazio',
          emoji: '👾',
          traits: ['misterioso', 'profundo', 'reflexivo', 'poderoso'],
          description:
            'O Caminhante do Vazio abraça os mistérios do universo. Profundo e reflexivo, seu poder vem do conhecimento oculto.',
          rarity: 'épico',
          element: 'sombra',
        },
      ],
      [
        'windstrider',
        {
          name: 'Corcel dos Ventos',
          emoji: '🦄',
          traits: ['livre', 'rápido', 'adaptável', 'inspirador'],
          description:
            'Como um Corcel dos Ventos, você é livre e veloz. Adaptável como o vento, inspira outros com sua energia.',
          rarity: 'raro',
          element: 'ar',
        },
      ],
      [
        'treant',
        {
          name: 'Treant Sábio',
          emoji: '🌳',
          traits: ['enraizado', 'crescimento', 'nutrição', 'ancestral'],
          description:
            'O Treant representa sabedoria ancestral e crescimento constante. Enraizado mas sempre se expandindo.',
          rarity: 'épico',
          element: 'natureza',
        },
      ],
      [
        'spirit_healer',
        {
          name: 'Curandeiro Espiritual',
          emoji: '👻',
          traits: ['empático', 'curador', 'guia', 'transcendente'],
          description:
            'Como um Curandeiro Espiritual, você guia e cura. Sua empatia transcende o plano físico.',
          rarity: 'lendário',
          element: 'luz',
        },
      ],
      [
        'earth_elemental',
        {
          name: 'Elemental da Terra',
          emoji: '🗿',
          traits: ['sólido', 'confiável', 'persistente', 'fundamental'],
          description:
            'O Elemental da Terra é a fundação sólida. Confiável e persistente, você é a rocha onde outros se apoiam.',
          rarity: 'comum',
          element: 'terra',
        },
      ],
    ])
  }

  // Converte estado em string para Q-table
  private stateToString(state: PersonalityState): string {
    return `${state.activityTime}_${state.responseTime}_${Math.round(state.positiveInteractions / 10)}_${Math.round(state.musicInteractions / 10)}`
  }

  // Implementa Q-Learning
  private updateQValue(state: string, action: string, reward: number, nextState: string) {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map())
    }

    const currentQ = this.qTable.get(state)!.get(action) || 0

    // Encontra o valor máximo Q para o próximo estado
    let maxNextQ = 0
    if (this.qTable.has(nextState)) {
      const nextActions = this.qTable.get(nextState)!
      maxNextQ = Math.max(...Array.from(nextActions.values()))
    }

    // Equação de Bellman para Q-Learning
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ)

    this.qTable.get(state)!.set(action, newQ)
  }

  // Seleciona ação usando política epsilon-greedy
  private selectAction(state: string): string {
    const animals = Array.from(this.wowAnimals.keys())

    // Exploração
    if (Math.random() < this.explorationRate) {
      return animals[Math.floor(Math.random() * animals.length)]
    }

    // Exploração (escolhe melhor ação conhecida)
    if (!this.qTable.has(state)) {
      return animals[Math.floor(Math.random() * animals.length)]
    }

    const stateActions = this.qTable.get(state)!
    let bestAction = animals[0]
    let bestValue = -Infinity

    for (const [action, value] of stateActions) {
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }

    return bestAction
  }

  // Calcula recompensa baseada nas interações do usuário
  private calculateReward(state: PersonalityState, animal: string): number {
    let reward = 0
    const animalData = this.wowAnimals.get(animal)!

    // Recompensas baseadas em correspondência de traços
    if (state.positiveInteractions > state.negativeInteractions) {
      if (animalData.traits.includes('empático') || animalData.traits.includes('curador')) {
        reward += 10
      }
    }

    if (state.musicInteractions > 5) {
      if (animalData.traits.includes('inspirador') || animalData.traits.includes('paixão')) {
        reward += 8
      }
    }

    if (state.helpInteractions > 3) {
      if (animalData.traits.includes('sábio') || animalData.traits.includes('guia')) {
        reward += 7
      }
    }

    if (state.emojiUsage > 10) {
      if (animalData.traits.includes('livre') || animalData.traits.includes('transformação')) {
        reward += 5
      }
    }

    // Penalidades por incompatibilidade
    if (state.responseTime === 'rápido' && animalData.traits.includes('paciente')) {
      reward -= 5
    }

    if (state.activityTime === 'madrugada' && animalData.element === 'luz') {
      reward -= 3
    }

    return reward
  }

  // Analisa personalidade do usuário
  async analyzePersonality(
    userId: string,
    guildId: string,
    userState: PersonalityState
  ): Promise<WoWPersonalityAnimal> {
    const stateStr = this.stateToString(userState)

    // Seleciona animal usando Q-Learning
    const selectedAnimalKey = this.selectAction(stateStr)
    const selectedAnimal = this.wowAnimals.get(selectedAnimalKey)!

    // Calcula recompensa
    const reward = this.calculateReward(userState, selectedAnimalKey)

    // Simula próximo estado (para aprendizado)
    const nextState = { ...userState }
    nextState.messageCount += 1
    const nextStateStr = this.stateToString(nextState)

    // Atualiza Q-table
    this.updateQValue(stateStr, selectedAnimalKey, reward, nextStateStr)

    // Salva análise no banco
    await this.saveAnalysis(userId, guildId, selectedAnimal, userState, reward)

    return selectedAnimal
  }

  // Cria embed de resultado
  createPersonalityEmbed(
    animal: WoWPersonalityAnimal,
    state: PersonalityState,
    userName: string
  ): EmbedBuilder {
    const rarityColors = {
      comum: 0x9d9d9d,
      raro: 0x0070dd,
      épico: 0xa335ee,
      lendário: 0xff8000,
    }

    const elementEmojis = {
      fogo: '🔥',
      água: '💧',
      terra: '🗿',
      ar: '🌪️',
      natureza: '🌿',
      sombra: '🌑',
      luz: '✨',
    }

    const embed = new EmbedBuilder()
      .setColor(rarityColors[animal.rarity])
      .setTitle(`${animal.emoji} Análise de Personalidade - ${userName}`)
      .setDescription(`**Seu Animal Espiritual:** ${animal.name}\n\n${animal.description}`)
      .addFields(
        {
          name: '🎭 Traços Principais',
          value: animal.traits.map((t) => `• ${t.charAt(0).toUpperCase() + t.slice(1)}`).join('\n'),
          inline: true,
        },
        {
          name: `${elementEmojis[animal.element]} Elemento`,
          value: animal.element.charAt(0).toUpperCase() + animal.element.slice(1),
          inline: true,
        },
        {
          name: '💎 Raridade',
          value: animal.rarity.charAt(0).toUpperCase() + animal.rarity.slice(1),
          inline: true,
        }
      )
      .addFields({
        name: '📊 Estatísticas da Análise',
        value:
          `**Mensagens:** ${state.messageCount}\n` +
          `**Interações Positivas:** ${state.positiveInteractions}\n` +
          `**Período Mais Ativo:** ${state.activityTime}`,
        inline: false,
      })
      .setFooter({
        text: `🍁 Weed Of Warcraft | Análise baseada em ${state.messageCount} interações`,
        iconURL: 'https://i.imgur.com/AfFp7pu.png',
      })
      .setTimestamp()

    // Adiciona campo especial para lendários
    if (animal.rarity === 'lendário') {
      embed.addFields({
        name: '⭐ Conquista Especial',
        value: 'Você desbloqueou um animal espiritual LENDÁRIO! Isso é extremamente raro.',
        inline: false,
      })
    }

    return embed
  }

  // Envia análise via webhook
  async sendAnalysisViaWebhook(
    embed: EmbedBuilder,
    userName: string,
    userAvatar?: string
  ): Promise<void> {
    try {
      if (!this.webhookClient) return
      await this.webhookClient.send({
        username: 'Oráculo Espiritual WoW',
        avatarURL: 'https://i.imgur.com/wSTFkRM.png',
        embeds: [embed],
      })
    } catch (error) {
      this.client.logger.error('Erro ao enviar webhook:', error)
    }
  }

  // Salva análise no banco
  private async saveAnalysis(
    userId: string,
    guildId: string,
    animal: WoWPersonalityAnimal,
    state: PersonalityState,
    qValue: number
  ): Promise<void> {
    try {
      // Save personality analysis
      await this.client.db?.prisma.personalityAnalysis.create({
        data: {
          userId,
          guildId,
          animalKey:
            Array.from(this.wowAnimals.entries()).find(([k, v]) => v.name === animal.name)?.[0] ||
            '',
          animalData: animal as any,
          userStats: state as any,
          qValue,
        },
      })
    } catch (error) {
      console.error('Error saving personality analysis:', error)
    }
  }

  // Obtém estatísticas do usuário para análise
  async getUserStats(userId: string, guildId: string): Promise<PersonalityState> {
    try {
      // Busca histórico de chat do usuário
      const chatHistories = await this.client.db?.prisma.chatHistory.findMany({
        where: {
          guildId,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10, // Get more to ensure we have user's messages
      })

      let totalMessages = 0
      let positiveWords = 0
      let negativeWords = 0
      let emojiCount = 0
      let totalLength = 0
      let musicWords = 0
      let helpWords = 0

      // Palavras chave para análise
      const positiveKeywords = ['obrigado', 'thanks', 'ótimo', 'great', 'love', 'adoro', 'perfeito']
      const negativeKeywords = ['não', 'ruim', 'bad', 'problema', 'erro', 'hate']
      const musicKeywords = ['play', 'música', 'music', 'tocar', 'skip', 'volume']
      const helpKeywords = ['ajuda', 'help', 'como', 'how', '?']
      const emojiRegex =
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu

      // Filter histories that contain messages from the user
      const userHistories = chatHistories.filter((history) => {
        const messages = history.messages as any[]
        return messages.some((msg) => msg.userId === userId)
      })

      // Analisa mensagens
      userHistories.forEach((history) => {
        const messages = history.messages as any[]
        messages.forEach((msg) => {
          if (msg.role === 'user' && msg.userId === userId) {
            totalMessages++
            totalLength += msg.content.length

            const lowerContent = msg.content.toLowerCase()
            positiveWords += positiveKeywords.filter((word) => lowerContent.includes(word)).length
            negativeWords += negativeKeywords.filter((word) => lowerContent.includes(word)).length
            musicWords += musicKeywords.filter((word) => lowerContent.includes(word)).length
            helpWords += helpKeywords.filter((word) => lowerContent.includes(word)).length

            const emojis = msg.content.match(emojiRegex)
            if (emojis) emojiCount += emojis.length
          }
        })
      })

      // Busca análises anteriores para aprender padrões
      const previousAnalyses = await this.client.db.prisma.personalityAnalysis.findMany({
        where: { userId, guildId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      // Determina tempo de atividade baseado na hora atual
      const hour = new Date().getHours()
      let activityTime: 'madrugada' | 'manhã' | 'tarde' | 'noite' = 'manhã'

      if (hour >= 0 && hour < 6) activityTime = 'madrugada'
      else if (hour >= 6 && hour < 12) activityTime = 'manhã'
      else if (hour >= 12 && hour < 18) activityTime = 'tarde'
      else activityTime = 'noite'

      // Calcula médias
      const avgLength = totalMessages > 0 ? Math.round(totalLength / totalMessages) : 50

      // Determina velocidade de resposta baseada em padrões
      let responseTime: 'rápido' | 'médio' | 'lento' = 'médio'
      if (avgLength < 30) responseTime = 'rápido'
      else if (avgLength > 100) responseTime = 'lento'

      return {
        messageCount: totalMessages || Math.floor(Math.random() * 50) + 10,
        positiveInteractions: positiveWords * 5,
        negativeInteractions: negativeWords * 3,
        musicInteractions: musicWords * 4,
        helpInteractions: helpWords * 4,
        emojiUsage: emojiCount * 2,
        averageMessageLength: avgLength,
        activityTime,
        responseTime,
      }
    } catch (error) {
      console.error('Error getting user stats:', error)

      // Fallback para dados aleatórios
      const hour = new Date().getHours()
      let activityTime: 'madrugada' | 'manhã' | 'tarde' | 'noite' = 'manhã'

      if (hour >= 0 && hour < 6) activityTime = 'madrugada'
      else if (hour >= 6 && hour < 12) activityTime = 'manhã'
      else if (hour >= 12 && hour < 18) activityTime = 'tarde'
      else activityTime = 'noite'

      return {
        messageCount: Math.floor(Math.random() * 100) + 10,
        positiveInteractions: Math.floor(Math.random() * 50),
        negativeInteractions: Math.floor(Math.random() * 10),
        musicInteractions: Math.floor(Math.random() * 30),
        helpInteractions: Math.floor(Math.random() * 20),
        emojiUsage: Math.floor(Math.random() * 40),
        averageMessageLength: Math.floor(Math.random() * 100) + 20,
        activityTime,
        responseTime: ['rápido', 'médio', 'lento'][Math.floor(Math.random() * 3)] as any,
      }
    }
  }
}

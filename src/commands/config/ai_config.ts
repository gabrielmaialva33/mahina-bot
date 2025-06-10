import Discord, {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js'
import Command from '#common/command'
import { AIService } from '#src/services/ai_service'
import MahinaBot from '#common/mahina_bot'
import { Context } from 'node:vm'

const { InteractionResponseFlags } = Discord

export default class AIConfigCommand extends Command {
  private aiService: AIService

  constructor(client: MahinaBot) {
    super(client, {
      name: 'aiconfig',
      description: {
        content: 'Configura o comportamento da IA da Mahina',
        examples: ['aiconfig', 'aiconfig personality', 'aiconfig toggle', 'aiconfig stats'],
        usage: 'aiconfig [opção]',
      },
      category: 'config',
      aliases: ['aicfg', 'aisetup'],
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [
        {
          name: 'action',
          description: 'Ação a ser executada',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🎭 Personalidade', value: 'personality' },
            { name: '🔀 Ativar/Desativar', value: 'toggle' },
            { name: '📊 Estatísticas', value: 'stats' },
            { name: '🧹 Limpar Memória', value: 'clear' },
            { name: '⚙️ Configurações', value: 'settings' },
          ],
        },
      ],
    })

    this.aiService = new AIService(client)
  }

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const action = args[0]?.toLowerCase() || 'menu'
    const guildId = ctx.guild?.id

    if (!guildId) return

    switch (action) {
      case 'personality':
        return this.handlePersonality(ctx)
      case 'toggle':
        return this.handleToggle(ctx, guildId)
      case 'stats':
        return this.handleStats(ctx, guildId)
      case 'clear':
        return this.handleClear(ctx)
      case 'settings':
        return this.handleSettings(ctx, guildId)
      default:
        return this.showMenu(ctx)
    }
  }

  private async showMenu(ctx: Context) {
    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('⚙️ Configuração da IA - Mahina')
      .setDescription('Escolha uma opção para configurar o comportamento da IA')
      .addFields(
        {
          name: '🎭 Personalidade',
          value: 'Altere a personalidade da Mahina (amigável, profissional, brincalhona, DJ)',
          inline: false,
        },
        {
          name: '🔀 Ativar/Desativar',
          value: 'Ative ou desative as respostas da IA quando mencionarem "mahina"',
          inline: false,
        },
        {
          name: '📊 Estatísticas',
          value: 'Veja estatísticas de uso da IA no servidor',
          inline: false,
        },
        {
          name: '🧹 Limpar Memória',
          value: 'Limpe o histórico de conversas da IA em todos os canais',
          inline: false,
        },
        {
          name: '⚙️ Configurações',
          value: 'Veja as configurações atuais da IA',
          inline: false,
        }
      )
      .setFooter({ text: 'Use os botões abaixo para navegar' })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ai_cfg_personality')
        .setLabel('Personalidade')
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_toggle')
        .setLabel('Ativar/Desativar')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_stats')
        .setLabel('Estatísticas')
        .setEmoji('📊')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_clear')
        .setLabel('Limpar')
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ai_cfg_settings')
        .setLabel('Config')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary)
    )

    const msg = await ctx.sendMessage({ embeds: [embed], components: [buttons] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    })

    collector.on(
      'collect',
      async (interaction: {
        user: { id: any }
        reply: (arg0: { content: string; flags?: number }) => any
        customId: any
        deferUpdate: () => any
      }) => {
        if (interaction.user.id !== ctx.author.id) {
          return interaction.reply({
            content: 'Apenas o autor do comando pode usar esses botões!',
            flags: InteractionResponseFlags.Ephemeral,
          })
        }

        switch (interaction.customId) {
          case 'ai_cfg_personality':
            await interaction.deferUpdate()
            await this.handlePersonality(ctx)
            break
          case 'ai_cfg_toggle':
            await interaction.deferUpdate()
            await this.handleToggle(ctx, ctx.guild!.id)
            break
          case 'ai_cfg_stats':
            await interaction.deferUpdate()
            await this.handleStats(ctx, ctx.guild!.id)
            break
          case 'ai_cfg_clear':
            await interaction.deferUpdate()
            await this.handleClear(ctx)
            break
          case 'ai_cfg_settings':
            await interaction.deferUpdate()
            await this.handleSettings(ctx, ctx.guild!.id)
            break
        }
      }
    )

    collector.on('end', () => {
      msg.edit({ components: [] })
    })
  }

  private async handlePersonality(ctx: Context) {
    const personalities = this.aiService.getPersonalities()
    const options = Array.from(personalities.entries()).map(([key, personality]) => ({
      label: personality.name,
      description: personality.description,
      value: key,
      emoji: personality.emoji,
    }))

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ai_personality_guild')
        .setPlaceholder('Escolha a personalidade padrão do servidor')
        .addOptions(options)
    )

    const embed = this.aiService.createPersonalityEmbed(personalities, 'friendly')

    const msg = await ctx.sendMessage({ embeds: [embed], components: [selectMenu] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    })

    collector.on(
      'collect',
      async (interaction: {
        user: { id: any }
        reply: (arg0: { content: string; flags?: number }) => any
        values: any[]
        update: (arg0: { content: string; embeds: never[]; components: never[] }) => any
      }) => {
        if (interaction.user.id !== ctx.author.id) {
          return interaction.reply({
            content: 'Apenas o autor do comando pode usar este menu!',
            flags: InteractionResponseFlags.Ephemeral,
          })
        }

        const selected = interaction.values[0]
        await this.client.db.setAIPersonality(ctx.guild!.id, selected)

        const selectedPersonality = this.aiService.getPersonality(selected)!
        await interaction.update({
          content: `${selectedPersonality.emoji} Personalidade padrão do servidor alterada para: **${selectedPersonality.name}**`,
          embeds: [],
          components: [],
        })
      }
    )
  }

  private async handleToggle(ctx: Context, guildId: string) {
    const isEnabled = await this.client.db.toggleAI(guildId)

    const embed = new EmbedBuilder()
      .setColor(isEnabled ? this.client.config.color.green : this.client.config.color.red)
      .setTitle(isEnabled ? '✅ IA Ativada' : '❌ IA Desativada')
      .setDescription(
        isEnabled
          ? 'A Mahina agora responderá quando mencionada em conversas!'
          : 'A Mahina não responderá mais quando mencionada.'
      )

    await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleStats(ctx: Context, guildId: string) {
    const config = await this.client.db.getAIConfig(guildId)
    const stats = config.stats || { totalMessages: 0, uniqueUsers: [], channelUsage: {} }

    // Find most used channel
    const channelUsage = stats.channelUsage || {}
    const mostUsedChannel = Object.entries(channelUsage).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('📊 Estatísticas de IA - ' + ctx.guild?.name)
      .setDescription('Uso da IA neste servidor')
      .addFields(
        { name: 'Total de Mensagens', value: stats.totalMessages.toString(), inline: true },
        {
          name: 'Usuários Únicos',
          value: (stats.uniqueUsers?.length || 0).toString(),
          inline: true,
        },
        {
          name: 'Personalidade Padrão',
          value:
            this.aiService.getPersonality(config.defaultPersonality)?.emoji +
            ' ' +
            this.aiService.getPersonality(config.defaultPersonality)?.name,
          inline: true,
        },
        {
          name: 'Canal Mais Ativo',
          value: mostUsedChannel ? `<#${mostUsedChannel[0]}>` : 'Nenhum',
          inline: true,
        },
        { name: 'Status', value: config.enabled ? '✅ Ativada' : '❌ Desativada', inline: true },
        { name: 'Rate Limit', value: `${config.rateLimit} msgs/min`, inline: true }
      )
      .setFooter({
        text: 'Estatísticas desde: ' + new Date(config.createdAt).toLocaleDateString('pt-BR'),
      })

    await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleClear(ctx: Context) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.yellow)
      .setTitle('⚠️ Confirmar Limpeza')
      .setDescription('Tem certeza que deseja limpar todo o histórico de conversas da IA?')
      .setFooter({ text: 'Esta ação não pode ser desfeita!' })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ai_clear_confirm')
        .setLabel('Confirmar')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ai_clear_cancel')
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    )

    const msg = await ctx.sendMessage({ embeds: [confirmEmbed], components: [buttons] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    })

    collector.on(
      'collect',
      async (interaction: {
        user: { id: any }
        reply: (arg0: { content: string; flags?: number }) => any
        customId: string
        update: (arg0: { embeds: EmbedBuilder[]; components: never[] }) => any
      }) => {
        if (interaction.user.id !== ctx.author.id) {
          return interaction.reply({
            content: 'Apenas o autor do comando pode confirmar!',
            flags: InteractionResponseFlags.Ephemeral,
          })
        }

        if (interaction.customId === 'ai_clear_confirm') {
          // Clear all chat history for guild
          await this.client.db.clearAllChatHistory(ctx.guild!.id)

          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(this.client.config.color.green)
                .setTitle('✅ Histórico Limpo')
                .setDescription('Todo o histórico de conversas da IA foi removido!'),
            ],
            components: [],
          })
        } else {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(this.client.config.color.blue)
                .setTitle('❌ Limpeza Cancelada')
                .setDescription('O histórico de conversas foi mantido.'),
            ],
            components: [],
          })
        }
      }
    )
  }

  private async handleSettings(ctx: Context, guildId: string) {
    const config = await this.client.db.getAIConfig(guildId)
    const personality = this.aiService.getPersonality(config.defaultPersonality)

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle('⚙️ Configurações Atuais da IA')
      .addFields(
        { name: 'Status', value: config.enabled ? '✅ Ativada' : '❌ Desativada', inline: true },
        {
          name: 'Personalidade Padrão',
          value: `${personality?.emoji} ${personality?.name}`,
          inline: true,
        },
        { name: 'Rate Limit', value: `${config.rateLimit} msgs/min`, inline: true },
        { name: 'Histórico Máximo', value: `${config.maxHistory} mensagens`, inline: true },
        { name: 'Janela de Contexto', value: `${config.contextWindow} mensagens`, inline: true },
        {
          name: 'API em Uso',
          value: process.env.NVIDIA_API_KEY ? 'NVIDIA' : 'OpenAI',
          inline: true,
        },
        {
          name: 'Canais Permitidos',
          value:
            config.allowedChannels.length > 0
              ? config.allowedChannels.map((c: any) => `<#${c}>`).join(', ')
              : 'Todos',
          inline: false,
        },
        {
          name: 'Usuários Bloqueados',
          value: config.blockedUsers.length > 0 ? config.blockedUsers.length.toString() : 'Nenhum',
          inline: true,
        }
      )
      .setFooter({
        text: `Servidor: ${ctx.guild?.name} | Criado em: ${new Date(config.createdAt).toLocaleDateString('pt-BR')}`,
      })

    await ctx.sendMessage({ embeds: [embed] })
  }
}

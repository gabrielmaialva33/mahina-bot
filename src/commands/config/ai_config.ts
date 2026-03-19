import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js'
import Command from '#common/command'
import { AIService } from '#src/services/ai_service'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

export default class AIConfigCommand extends Command {
  private aiService: AIService

  constructor(client: MahinaBot) {
    super(client, {
      name: 'aiconfig',
      description: {
        content: 'cmd.aiconfig.description',
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

  public async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
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
      .setTitle(ctx.locale('cmd.aiconfig.ui.menu.title'))
      .setDescription(ctx.locale('cmd.aiconfig.ui.menu.description'))
      .addFields(
        {
          name: ctx.locale('cmd.aiconfig.ui.menu.fields.personality.name'),
          value: ctx.locale('cmd.aiconfig.ui.menu.fields.personality.value'),
          inline: false,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.menu.fields.toggle.name'),
          value: ctx.locale('cmd.aiconfig.ui.menu.fields.toggle.value'),
          inline: false,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.menu.fields.stats.name'),
          value: ctx.locale('cmd.aiconfig.ui.menu.fields.stats.value'),
          inline: false,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.menu.fields.clear.name'),
          value: ctx.locale('cmd.aiconfig.ui.menu.fields.clear.value'),
          inline: false,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.menu.fields.settings.name'),
          value: ctx.locale('cmd.aiconfig.ui.menu.fields.settings.value'),
          inline: false,
        }
      )
      .setFooter({ text: ctx.locale('cmd.aiconfig.ui.menu.footer') })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ai_cfg_personality')
        .setLabel(ctx.locale('cmd.aiconfig.ui.actions.personality'))
        .setEmoji('🎭')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_toggle')
        .setLabel(ctx.locale('cmd.aiconfig.ui.actions.toggle'))
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_stats')
        .setLabel(ctx.locale('cmd.aiconfig.ui.actions.stats'))
        .setEmoji('📊')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ai_cfg_clear')
        .setLabel(ctx.locale('cmd.aiconfig.ui.actions.clear'))
        .setEmoji('🧹')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ai_cfg_settings')
        .setLabel(ctx.locale('cmd.aiconfig.ui.actions.settings'))
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary)
    )

    const msg = await ctx.sendMessage({ embeds: [embed], components: [buttons] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    })

    collector.on('collect', async (interaction: ButtonInteraction) => {
      if (interaction.user.id !== ctx.author?.id) {
        return interaction.reply({
          content: ctx.locale('cmd.aiconfig.ui.errors.author_only'),
          flags: MessageFlags.Ephemeral,
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
    })

    collector.on('end', () => {
      msg.edit({ components: [] })
    })
  }

  private async handlePersonality(ctx: Context) {
    const config = await this.client.db.getAIConfig(ctx.guild!.id)
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
        .setPlaceholder(ctx.locale('cmd.aiconfig.ui.personality.placeholder'))
        .addOptions(options)
    )

    const embed = this.aiService.createPersonalityEmbed(personalities, config.defaultPersonality)
    embed
      .setTitle(ctx.locale('cmd.aiconfig.ui.personality.title'))
      .setDescription(ctx.locale('cmd.aiconfig.ui.personality.description'))

    const msg = await ctx.sendMessage({ embeds: [embed], components: [selectMenu] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    })

    collector.on('collect', async (interaction: StringSelectMenuInteraction) => {
      if (interaction.user.id !== ctx.author?.id) {
        return interaction.reply({
          content: ctx.locale('cmd.aiconfig.ui.errors.author_only_menu'),
          flags: MessageFlags.Ephemeral,
        })
      }

      const selected = interaction.values[0]
      await this.client.db.setAIPersonality(ctx.guild!.id, selected)

      const selectedPersonality = this.aiService.getPersonality(selected)!
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor(this.client.config.color.green)
            .setTitle(ctx.locale('cmd.aiconfig.ui.personality.updated_title'))
            .setDescription(
              ctx.locale('cmd.aiconfig.ui.personality.updated', {
                emoji: selectedPersonality.emoji,
                name: selectedPersonality.name,
              })
            ),
        ],
        components: [],
      })
    })
  }

  private async handleToggle(ctx: Context, guildId: string) {
    const isEnabled = await this.client.db.toggleAI(guildId)

    const embed = new EmbedBuilder()
      .setColor(isEnabled ? this.client.config.color.green : this.client.config.color.red)
      .setTitle(
        ctx.locale(
          isEnabled
            ? 'cmd.aiconfig.ui.toggle.enabled_title'
            : 'cmd.aiconfig.ui.toggle.disabled_title'
        )
      )
      .setDescription(
        ctx.locale(isEnabled ? 'cmd.aiconfig.ui.toggle.enabled' : 'cmd.aiconfig.ui.toggle.disabled')
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
      .setTitle(ctx.locale('cmd.aiconfig.ui.stats.title', { guild: ctx.guild?.name ?? 'Servidor' }))
      .setDescription(ctx.locale('cmd.aiconfig.ui.stats.description'))
      .addFields(
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.total_messages'),
          value: stats.totalMessages.toString(),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.unique_users'),
          value: (stats.uniqueUsers?.length || 0).toString(),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.personality'),
          value:
            this.aiService.getPersonality(config.defaultPersonality)?.emoji +
            ' ' +
            this.aiService.getPersonality(config.defaultPersonality)?.name,
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.top_channel'),
          value: mostUsedChannel
            ? `<#${mostUsedChannel[0]}>`
            : ctx.locale('cmd.aiconfig.ui.values.none'),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.status'),
          value: ctx.locale(
            config.enabled ? 'cmd.aiconfig.ui.values.enabled' : 'cmd.aiconfig.ui.values.disabled'
          ),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.stats.fields.rate_limit'),
          value: ctx.locale('cmd.aiconfig.ui.values.rate_limit', {
            value: String(config.rateLimit),
          }),
          inline: true,
        }
      )
      .setFooter({
        text: ctx.locale('cmd.aiconfig.ui.stats.footer', {
          date: new Date(config.createdAt).toLocaleDateString('pt-BR'),
        }),
      })

    await ctx.sendMessage({ embeds: [embed] })
  }

  private async handleClear(ctx: Context) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(this.client.config.color.yellow)
      .setTitle(ctx.locale('cmd.aiconfig.ui.clear.title'))
      .setDescription(ctx.locale('cmd.aiconfig.ui.clear.description'))
      .setFooter({ text: ctx.locale('cmd.aiconfig.ui.clear.footer') })

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ai_clear_confirm')
        .setLabel(ctx.locale('cmd.aiconfig.ui.clear.confirm'))
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ai_clear_cancel')
        .setLabel(ctx.locale('cmd.aiconfig.ui.clear.cancel'))
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    )

    const msg = await ctx.sendMessage({ embeds: [confirmEmbed], components: [buttons] })

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    })

    collector.on('collect', async (interaction: ButtonInteraction) => {
      if (interaction.user.id !== ctx.author?.id) {
        return interaction.reply({
          content: ctx.locale('cmd.aiconfig.ui.errors.author_only_confirm'),
          flags: MessageFlags.Ephemeral,
        })
      }

      if (interaction.customId === 'ai_clear_confirm') {
        await this.client.db.clearAllChatHistory(ctx.guild!.id)

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(this.client.config.color.green)
              .setTitle(ctx.locale('cmd.aiconfig.ui.clear.success_title'))
              .setDescription(ctx.locale('cmd.aiconfig.ui.clear.success')),
          ],
          components: [],
        })
      } else {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(this.client.config.color.blue)
              .setTitle(ctx.locale('cmd.aiconfig.ui.clear.cancelled_title'))
              .setDescription(ctx.locale('cmd.aiconfig.ui.clear.cancelled')),
          ],
          components: [],
        })
      }
    })
  }

  private async handleSettings(ctx: Context, guildId: string) {
    const config = await this.client.db.getAIConfig(guildId)
    const personality = this.aiService.getPersonality(config.defaultPersonality)

    const embed = new EmbedBuilder()
      .setColor(this.client.config.color.main)
      .setTitle(ctx.locale('cmd.aiconfig.ui.settings.title'))
      .addFields(
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.status'),
          value: ctx.locale(
            config.enabled ? 'cmd.aiconfig.ui.values.enabled' : 'cmd.aiconfig.ui.values.disabled'
          ),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.personality'),
          value: `${personality?.emoji} ${personality?.name}`,
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.rate_limit'),
          value: ctx.locale('cmd.aiconfig.ui.values.rate_limit', {
            value: String(config.rateLimit),
          }),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.max_history'),
          value: ctx.locale('cmd.aiconfig.ui.values.messages', {
            value: String(config.maxHistory),
          }),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.context_window'),
          value: ctx.locale('cmd.aiconfig.ui.values.messages', {
            value: String(config.contextWindow),
          }),
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.provider'),
          value: process.env.NVIDIA_API_KEY ? 'NVIDIA' : 'OpenAI',
          inline: true,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.allowed_channels'),
          value:
            config.allowedChannels.length > 0
              ? config.allowedChannels.map((channelId: string) => `<#${channelId}>`).join(', ')
              : ctx.locale('cmd.aiconfig.ui.values.all_channels'),
          inline: false,
        },
        {
          name: ctx.locale('cmd.aiconfig.ui.settings.fields.blocked_users'),
          value:
            config.blockedUsers.length > 0
              ? config.blockedUsers.length.toString()
              : ctx.locale('cmd.aiconfig.ui.values.none'),
          inline: true,
        }
      )
      .setFooter({
        text: ctx.locale('cmd.aiconfig.ui.settings.footer', {
          guild: ctx.guild?.name ?? 'Servidor',
          date: new Date(config.createdAt).toLocaleDateString('pt-BR'),
        }),
      })

    await ctx.sendMessage({ embeds: [embed] })
  }
}

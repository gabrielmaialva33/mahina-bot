import {
  ApplicationCommandOptionType,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type { Context } from '#common/context'

export default class AIChannelCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'aichannel',
      description: {
        content: 'cmd.aichannel.description',
        examples: ['aichannel #general', 'aichannel clear'],
        usage: 'aichannel <#channel|clear>',
      },
      category: 'config',
      aliases: ['ai-channel', 'set-ai-channel'],
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
          name: 'channel',
          description: 'cmd.aichannel.options.channel',
          type: ApplicationCommandOptionType.Channel,
          required: false,
          channelTypes: [ChannelType.GuildText],
        },
        {
          name: 'action',
          description: 'cmd.aichannel.options.action',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: 'Limpar',
              value: 'clear',
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const guildId = ctx.guild?.id
    if (!guildId) return

    const aiConfig = await client.db.getAIConfig(guildId)

    // Handle slash command
    if (ctx.isInteraction) {
      const channel = ctx.interaction.options.getChannel('channel')
      const action = ctx.interaction.options.getString('action')

      if (action === 'clear') {
        await client.prisma.aIConfig.update({
          where: { guildId },
          data: { allowedChannels: [] },
        })

        await this.refreshGuildTracking(client, guildId)

        await ctx.sendMessage({
          embeds: [
            this.createEmbed(
              ctx,
              'green',
              'cmd.aichannel.ui.cleared.title',
              'cmd.aichannel.cleared'
            ),
          ],
        })
        return
      }

      if (channel) {
        await client.prisma.aIConfig.update({
          where: { guildId },
          data: { allowedChannels: [channel.id] },
        })

        await this.refreshGuildTracking(client, guildId)

        await ctx.sendMessage({
          embeds: [
            this.createEmbed(ctx, 'green', 'cmd.aichannel.ui.set.title', 'cmd.aichannel.set', {
              channel: channel.toString(),
            }),
          ],
        })
        return
      }
    }

    if (args[0] === 'clear') {
      await client.prisma.aIConfig.update({
        where: { guildId },
        data: { allowedChannels: [] },
      })

      await this.refreshGuildTracking(client, guildId)

      await ctx.sendMessage({
        embeds: [
          this.createEmbed(ctx, 'green', 'cmd.aichannel.ui.cleared.title', 'cmd.aichannel.cleared'),
        ],
      })
      return
    }

    if (!args[0]) {
      const currentChannels = aiConfig?.allowedChannels || []

      if (currentChannels.length === 0) {
        await ctx.sendMessage({
          embeds: [
            this.createEmbed(
              ctx,
              'yellow',
              'cmd.aichannel.ui.current_none.title',
              'cmd.aichannel.current_none'
            ),
          ],
        })
        return
      }

      const channelMentions = currentChannels.map((id) => `<#${id}>`).join(', ')

      await ctx.sendMessage({
        embeds: [
          this.createEmbed(ctx, 'main', 'cmd.aichannel.ui.current.title', 'cmd.aichannel.current', {
            channels: channelMentions,
          }),
        ],
      })
      return
    }

    const channelMatch = args[0].match(/^<#(\d+)>$/)
    if (channelMatch) {
      const channelId = channelMatch[1]
      const channel = ctx.guild?.channels.cache.get(channelId)

      if (!channel || channel.type !== ChannelType.GuildText) {
        await ctx.sendMessage({
          embeds: [
            this.createEmbed(
              ctx,
              'red',
              'cmd.aichannel.ui.invalid_channel.title',
              'cmd.aichannel.invalid_channel'
            ),
          ],
        })
        return
      }

      await client.prisma.aIConfig.update({
        where: { guildId },
        data: { allowedChannels: [channelId] },
      })

      await this.refreshGuildTracking(client, guildId)

      await ctx.sendMessage({
        embeds: [
          this.createEmbed(ctx, 'green', 'cmd.aichannel.ui.set.title', 'cmd.aichannel.set', {
            channel: channel.toString(),
          }),
        ],
      })
      return
    }

    await ctx.sendMessage({
      embeds: [this.createEmbed(ctx, 'red', 'cmd.aichannel.ui.usage.title', 'cmd.aichannel.usage')],
    })
  }

  private async refreshGuildTracking(client: MahinaBot, guildId: string): Promise<void> {
    if (!client.services?.proactiveInteraction) return
    const guild = client.guilds.cache.get(guildId)
    if (!guild) return
    await client.services.proactiveInteraction.handleGuildCreate(guild)
  }

  private createEmbed(
    ctx: Context,
    color: 'green' | 'red' | 'yellow' | 'main',
    titleKey: string,
    descriptionKey: string,
    params?: Record<string, string>
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.client.config.color[color])
      .setTitle(ctx.locale(titleKey))
      .setDescription(ctx.locale(descriptionKey, params))
  }
}

import { ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js'
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
              name: 'Clear',
              value: 'clear',
            },
          ],
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const guildId = ctx.guild?.id
    if (!guildId) return

    // Get current AI config
    const aiConfig = await client.db.getAIConfig(guildId)

    // Handle slash command
    if (ctx.isInteraction) {
      const channel = ctx.interaction.options.getChannel('channel')
      const action = ctx.interaction.options.getString('action')

      if (action === 'clear') {
        // Clear the allowed channels
        await client.prisma.aIConfig.update({
          where: { guildId },
          data: { allowedChannels: [] },
        })

        // Restart proactive service tracking for this guild
        if (client.services?.proactiveInteraction) {
          const guild = client.guilds.cache.get(guildId)
          if (guild) {
            await client.services.proactiveInteraction.handleGuildCreate(guild)
          }
        }

        return await ctx.sendMessage({
          content: ctx.locale('cmd.aichannel.cleared'),
        })
      }

      if (channel) {
        // Set the allowed channel
        await client.prisma.aIConfig.update({
          where: { guildId },
          data: { allowedChannels: [channel.id] },
        })

        // Restart proactive service tracking for this guild
        if (client.services?.proactiveInteraction) {
          const guild = client.guilds.cache.get(guildId)
          if (guild) {
            await client.services.proactiveInteraction.handleGuildCreate(guild)
          }
        }

        return await ctx.sendMessage({
          content: ctx.locale('cmd.aichannel.set', { channel: channel.toString() }),
        })
      }
    }

    // Handle text command
    if (args[0] === 'clear') {
      await client.prisma.aIConfig.update({
        where: { guildId },
        data: { allowedChannels: [] },
      })

      // Restart proactive service tracking for this guild
      if (client.services?.proactiveInteraction) {
        const guild = client.guilds.cache.get(guildId)
        if (guild) {
          await client.services.proactiveInteraction.handleGuildCreate(guild)
        }
      }

      return await ctx.sendMessage({
        content: ctx.locale('cmd.aichannel.cleared'),
      })
    }

    // Show current configuration
    if (!args[0]) {
      const currentChannels = aiConfig?.allowedChannels || []

      if (currentChannels.length === 0) {
        return await ctx.sendMessage({
          content: ctx.locale('cmd.aichannel.current_none'),
        })
      }

      const channelMentions = currentChannels.map((id) => `<#${id}>`).join(', ')

      return await ctx.sendMessage({
        content: ctx.locale('cmd.aichannel.current', { channels: channelMentions }),
      })
    }

    // Parse channel mention
    const channelMatch = args[0].match(/^<#(\d+)>$/)
    if (channelMatch) {
      const channelId = channelMatch[1]
      const channel = ctx.guild?.channels.cache.get(channelId)

      if (!channel || channel.type !== ChannelType.GuildText) {
        return await ctx.sendMessage({
          content: ctx.locale('cmd.aichannel.invalid_channel'),
        })
      }

      await client.prisma.aIConfig.update({
        where: { guildId },
        data: { allowedChannels: [channelId] },
      })

      // Restart proactive service tracking for this guild
      if (client.services?.proactiveInteraction) {
        const guild = client.guilds.cache.get(guildId)
        if (guild) {
          await client.services.proactiveInteraction.handleGuildCreate(guild)
        }
      }

      return await ctx.sendMessage({
        content: ctx.locale('cmd.aichannel.set', { channel: channel.toString() }),
      })
    }

    // Invalid input
    return await ctx.sendMessage({
      content: ctx.locale('cmd.aichannel.usage'),
    })
  }
}

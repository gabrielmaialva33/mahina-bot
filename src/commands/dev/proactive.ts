import { ApplicationCommandOptionType, EmbedBuilder, TextChannel } from 'discord.js'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

export default class ProactiveCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'proactive',
      description: {
        content: 'Manage proactive interaction settings',
        examples: ['proactive stats', 'proactive toggle', 'proactive test'],
        usage: 'proactive <action>',
      },
      category: 'dev',
      aliases: ['pi', 'interaction'],
      cooldown: 3,
      args: false,
      permissions: {
        dev: true,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'stats',
          description: 'Show proactive interaction statistics',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'test',
          description: 'Test proactive interaction in current channel',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'force',
          description: 'Force proactive interaction check',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const subcommand = ctx.isInteraction
      ? ctx.options.getSubCommand() || 'stats'
      : args[0] || 'stats'

    if (!client.services.proactiveInteraction) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: '❌ Proactive Interaction service is not available',
            color: 0xff0000,
          },
        ],
      })
    }

    switch (subcommand) {
      case 'stats': {
        const stats = client.services.proactiveInteraction.getStatistics()

        const embed = new EmbedBuilder()
          .setTitle('📊 Proactive Interaction Statistics')
          .setColor(0x5865f2)
          .addFields(
            {
              name: '📈 Total Channels Monitored',
              value: stats.totalChannels.toString(),
              inline: true,
            },
            {
              name: '😴 Inactive Channels',
              value: stats.inactiveChannels.toString(),
              inline: true,
            },
            {
              name: '📱 Active Channels',
              value: (stats.totalChannels - stats.inactiveChannels).toString(),
              inline: true,
            },
            {
              name: '🤖 Service Status',
              value: '✅ Running',
              inline: true,
            },
            {
              name: '⏰ Check Interval',
              value: '30 minutes',
              inline: true,
            },
            {
              name: '🔄 Inactivity Threshold',
              value: '3 hours',
              inline: true,
            }
          )
          .setFooter({
            text: 'Mahina Proactive Interaction System',
            iconURL: client.user?.displayAvatarURL(),
          })
          .setTimestamp()

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'test': {
        if (!ctx.channel?.isTextBased()) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: '❌ This command can only be used in text channels',
                color: 0xff0000,
              },
            ],
          })
        }

        // Force a proactive interaction in current channel
        try {
          if (!(ctx.channel instanceof TextChannel)) {
            return await ctx.sendMessage({
              embeds: [
                {
                  description: '❌ This command can only be used in text channels',
                  color: 0xff0000,
                },
              ],
            })
          }

          await client.services.proactiveInteraction.sendTestMessage(ctx.channel)

          return await ctx.sendMessage({
            embeds: [
              {
                description: '✅ Test proactive message sent!',
                color: 0x00ff00,
              },
            ],
          })
        } catch (error) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Failed to send test message: ${(error as Error).message}`,
                color: 0xff0000,
              },
            ],
          })
        }
      }

      case 'force': {
        try {
          // Force the interaction check
          await client.services.proactiveInteraction.forceInteractionCheck()

          return await ctx.sendMessage({
            embeds: [
              {
                description: '✅ Forced proactive interaction check completed!',
                color: 0x00ff00,
              },
            ],
          })
        } catch (error) {
          return await ctx.sendMessage({
            embeds: [
              {
                description: `❌ Failed to force check: ${(error as Error).message}`,
                color: 0xff0000,
              },
            ],
          })
        }
      }

      default: {
        return await ctx.sendMessage({
          embeds: [
            {
              title: '🤖 Proactive Interaction Commands',
              description: 'Available subcommands:',
              fields: [
                {
                  name: '/proactive stats',
                  value: 'Show interaction statistics',
                  inline: false,
                },
                {
                  name: '/proactive test',
                  value: 'Test interaction in current channel',
                  inline: false,
                },
                {
                  name: '/proactive force',
                  value: 'Force interaction check now',
                  inline: false,
                },
              ],
              color: 0x5865f2,
            },
          ],
        })
      }
    }
  }
}

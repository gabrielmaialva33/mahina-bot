import { ApplicationCommandOptionType, EmbedBuilder, TextChannel } from 'discord.js'
import Command from '#common/command'
import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'

export default class ProactiveCommand extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'proactive',
      description: {
        content: 'cmd.proactive.description',
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
          description: 'cmd.proactive.options.stats',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'test',
          description: 'cmd.proactive.options.test',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'force',
          description: 'cmd.proactive.options.force',
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
          this.createEmbed(
            ctx,
            client,
            'red',
            'cmd.proactive.ui.errors.unavailable.title',
            'cmd.proactive.ui.errors.unavailable.description'
          ),
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
              name: ctx.locale('cmd.proactive.ui.stats.fields.total_channels'),
              value: stats.totalChannels.toString(),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.inactive_channels'),
              value: stats.inactiveChannels.toString(),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.active_channels'),
              value: (stats.totalChannels - stats.inactiveChannels).toString(),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.status'),
              value: ctx.locale('cmd.proactive.ui.values.running'),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.check_interval'),
              value: ctx.locale('cmd.proactive.ui.values.check_interval'),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.threshold'),
              value: ctx.locale('cmd.proactive.ui.values.threshold'),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.recaps'),
              value: stats.totalRecapsSent.toString(),
              inline: true,
            },
            {
              name: ctx.locale('cmd.proactive.ui.stats.fields.callbacks'),
              value: stats.totalCallbacksSent.toString(),
              inline: true,
            }
          )
          .setDescription(ctx.locale('cmd.proactive.ui.stats.description'))
          .setFooter({
            text: ctx.locale('cmd.proactive.ui.stats.footer'),
            iconURL: client.user?.displayAvatarURL(),
          })
          .setTimestamp()

        return await ctx.sendMessage({ embeds: [embed] })
      }

      case 'test': {
        if (!ctx.channel?.isTextBased()) {
          return await ctx.sendMessage({
            embeds: [
              this.createEmbed(
                ctx,
                client,
                'red',
                'cmd.proactive.ui.errors.text_only.title',
                'cmd.proactive.ui.errors.text_only.description'
              ),
            ],
          })
        }

        // Force a proactive interaction in current channel
        try {
          if (!(ctx.channel instanceof TextChannel)) {
            return await ctx.sendMessage({
              embeds: [
                this.createEmbed(
                  ctx,
                  client,
                  'red',
                  'cmd.proactive.ui.errors.text_only.title',
                  'cmd.proactive.ui.errors.text_only.description'
                ),
              ],
            })
          }

          await client.services.proactiveInteraction.sendTestMessage(ctx.channel)

          return await ctx.sendMessage({
            embeds: [
              this.createEmbed(
                ctx,
                client,
                'green',
                'cmd.proactive.ui.test.success_title',
                'cmd.proactive.ui.test.success'
              ),
            ],
          })
        } catch (error) {
          return await ctx.sendMessage({
            embeds: [
              this.createEmbed(
                ctx,
                client,
                'red',
                'cmd.proactive.ui.test.error_title',
                'cmd.proactive.ui.test.error',
                { error: (error as Error).message }
              ),
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
              this.createEmbed(
                ctx,
                client,
                'green',
                'cmd.proactive.ui.force.success_title',
                'cmd.proactive.ui.force.success'
              ),
            ],
          })
        } catch (error) {
          return await ctx.sendMessage({
            embeds: [
              this.createEmbed(
                ctx,
                client,
                'red',
                'cmd.proactive.ui.force.error_title',
                'cmd.proactive.ui.force.error',
                { error: (error as Error).message }
              ),
            ],
          })
        }
      }

      default: {
        return await ctx.sendMessage({
          embeds: [
            new EmbedBuilder()
              .setColor(client.config.color.main)
              .setTitle(ctx.locale('cmd.proactive.ui.help.title'))
              .setDescription(ctx.locale('cmd.proactive.ui.help.description'))
              .addFields(
                {
                  name: '/proactive stats',
                  value: ctx.locale('cmd.proactive.ui.help.stats'),
                  inline: false,
                },
                {
                  name: '/proactive test',
                  value: ctx.locale('cmd.proactive.ui.help.test'),
                  inline: false,
                },
                {
                  name: '/proactive force',
                  value: ctx.locale('cmd.proactive.ui.help.force'),
                  inline: false,
                }
              ),
          ],
        })
      }
    }
  }

  private createEmbed(
    ctx: Context,
    client: MahinaBot,
    color: 'red' | 'green' | 'main',
    titleKey: string,
    descriptionKey: string,
    params?: Record<string, string>
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(client.config.color[color])
      .setTitle(ctx.locale(titleKey))
      .setDescription(ctx.locale(descriptionKey, params))
  }
}

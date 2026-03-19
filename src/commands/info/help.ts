import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Help extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'help',
      description: {
        content: 'cmd.help.description',
        examples: ['help'],
        usage: 'help',
      },
      category: 'info',
      aliases: ['h'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'command',
          description: 'cmd.help.options.command',
          type: 3,
          required: false,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    const guild = await client.db.get(ctx.guild!.id)
    const prefix = guild?.prefix || client.config.prefix
    const commands = this.client.commands.filter((cmd) => cmd.category !== 'dev')
    const categories = [...new Set(commands.map((cmd) => cmd.category))]

    if (args[0]) {
      const command = this.client.commands.get(args[0].toLowerCase())
      if (!command) {
        return await ctx.sendMessage({
          embeds: [
            this.client
              .embed()
              .setColor(this.client.color.red)
              .setDescription(
                ctx.locale('cmd.help.not_found', {
                  cmdName: args[0],
                })
              ),
          ],
        })
      }
      const helpEmbed = this.client
        .embed()
        .setColor(client.color.main)
        .setTitle(`${ctx.locale('cmd.help.title')} - ${command.name}`)
        .setDescription(ctx.locale(command.description.content))
        .addFields(
          {
            name: ctx.locale('cmd.help.sections.usage'),
            value: `\`${prefix}${command.description.usage}\``,
            inline: false,
          },
          {
            name: ctx.locale('cmd.help.sections.examples'),
            value: command.description.examples.length
              ? command.description.examples
                  .map((example: string) => `\`${prefix}${example}\``)
                  .join('\n')
              : ctx.locale('cmd.help.values.none'),
            inline: false,
          },
          {
            name: ctx.locale('cmd.help.sections.details'),
            value:
              ctx.locale('cmd.help.help_cmd', {
                aliases: command.aliases.length
                  ? command.aliases.map((alias: string) => `\`${alias}\``).join(', ')
                  : ctx.locale('cmd.help.values.none'),
                category: command.category,
                cooldown: command.cooldown,
                premUser:
                  command.permissions.user.length > 0
                    ? command.permissions.user.map((perm: string) => `\`${perm}\``).join(', ')
                    : ctx.locale('cmd.help.values.none'),
                premBot:
                  command.permissions.client.length > 0
                    ? command.permissions.client.map((perm: string) => `\`${perm}\``).join(', ')
                    : ctx.locale('cmd.help.values.none'),
                dev: command.permissions.dev
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
                slash: command.slashCommand
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
                args: command.args
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
                player: command.player.active
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
                dj: command.player.dj
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
                djPerm: command.player.djPerm || ctx.locale('cmd.help.values.none'),
                voice: command.player.voice
                  ? ctx.locale('cmd.help.values.yes')
                  : ctx.locale('cmd.help.values.no'),
              }) +
              '\n' +
              ctx.locale('cmd.help.meta', {
                description: ctx.locale(command.description.content),
              }),
            inline: false,
          }
        )
        .setFooter({
          text: ctx.locale('cmd.help.footer', { prefix }),
        })
      return await ctx.sendMessage({ embeds: [helpEmbed] })
    }

    const fields = categories.map((category) => {
      const categoryCommands = commands.filter((cmd) => cmd.category === category)

      return {
        name: ctx.locale('cmd.help.category_title', {
          category,
          count: categoryCommands.length,
        }),
        value: categoryCommands.map((cmd) => `\`${cmd.name}\``).join(', '),
        inline: false,
      }
    })

    const helpEmbed = this.client
      .embed()
      .setColor(client.color.main)
      .setTitle(ctx.locale('cmd.help.title'))
      .setDescription(
        ctx.locale('cmd.help.content', {
          bot: client.user?.username,
          prefix,
        })
      )
      .addFields(
        {
          name: ctx.locale('cmd.help.sections.quick_start'),
          value: ctx.locale('cmd.help.quick_start', {
            prefix,
            total: commands.size,
          }),
          inline: false,
        },
        ...fields
      )
      .setFooter({
        text: ctx.locale('cmd.help.footer', { prefix }),
      })

    await ctx.sendMessage({ embeds: [helpEmbed] })
  }
}

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

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const embed = this.client.embed()
    const guild = await client.db.get(ctx.guild!.id)
    const commands = this.client.commands.filter(
      (cmd: { category: string }) => cmd.category !== 'dev'
    )
    const categories = [...new Set(commands.map((cmd: { category: any }) => cmd.category))]

    if (args[0]) {
      const command = this.client.commands.get(args[0].toLowerCase())
      if (!command) {
        return await ctx.sendMessage({
          embeds: [
            embed.setColor(this.client.color.red).setDescription(
              ctx.locale('cmd.help.not_found', {
                cmdName: args[0],
              })
            ),
          ],
        })
      }
      const helpEmbed = embed
        .setColor(client.color.main)
        .setTitle(`${ctx.locale('cmd.help.title')} - ${command.name}`)
        .setDescription(
          ctx.locale('cmd.help.help_cmd', {
            description: ctx.locale(command.description.content),
            usage: `${guild?.prefix}${command.description.usage}`,
            examples: command.description.examples
              .map((example: string) => `${guild.prefix}${example}`)
              .join(', '),
            aliases: command.aliases.map((alias: string) => `\`${alias}\``).join(', '),
            category: command.category,
            cooldown: command.cooldown,
            premUser:
              command.permissions.user.length > 0
                ? command.permissions.user.map((perm: string) => `\`${perm}\``).join(', ')
                : 'None',
            premBot: command.permissions.client.map((perm: string) => `\`${perm}\``).join(', '),
            dev: command.permissions.dev ? 'Yes' : 'No',
            slash: command.slashCommand ? 'Yes' : 'No',
            args: command.args ? 'Yes' : 'No',
            player: command.player.active ? 'Yes' : 'No',
            dj: command.player.dj ? 'Yes' : 'No',
            djPerm: command.player.djPerm ? command.player.djPerm : 'None',
            voice: command.player.voice ? 'Yes' : 'No',
          })
        )
      return await ctx.sendMessage({ embeds: [helpEmbed] })
    }

    const fields = categories.map((category) => ({
      name: category,
      value: commands
        .filter((cmd: { category: unknown }) => cmd.category === category)
        .map((cmd: { name: any }) => `\`${cmd.name}\``)
        .join(', '),
      inline: false,
    }))

    const helpEmbed = embed
      .setColor(client.color.main)
      .setTitle(ctx.locale('cmd.help.title'))
      .setDescription(
        ctx.locale('cmd.help.content', {
          bot: client.user?.username,
          prefix: guild.prefix,
        })
      )
      .setFooter({
        text: ctx.locale('cmd.help.footer', { prefix: guild.prefix }),
      })
      .addFields(...fields)

    return await ctx.sendMessage({ embeds: [helpEmbed] })
  }
}

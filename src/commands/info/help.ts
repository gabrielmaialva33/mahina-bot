import { Command, Context, BaseClient } from '#common/index'

export default class Help extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'help',
      description: {
        content: 'Mostra a lista de comandos disponíveis',
        examples: ['help'],
        usage: 'help',
      },
      category: 'info',
      aliases: ['h', 'ajuda'],
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'command',
          description: 'Comando para obter ajuda',
          type: 3,
          required: false,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const embed = client.embed()

    const prefix = client.env.DISC_BOT_PREFIX

    const commands = this.client.commands.filter((cmd) => cmd.category !== 'dev')
    const categories = commands
      .map((cmd) => cmd.category)
      .filter((value, index, self) => self.indexOf(value) === index)

    if (!args[0]) {
      const fildes: { name: any; value: string; inline: boolean }[] = []
      categories.forEach((category) => {
        fildes.push({
          name: category,
          value: commands
            .filter((cmd) => cmd.category === category)
            .map((cmd) => `\`${cmd.name}\``)
            .join(', '),
          inline: false,
        })
      })

      const helpEmbed = embed
        .setColor(this.client.color.main)
        .setTitle(` ⛑️ 𝘼𝙟𝙪𝙙𝙖 𝙙𝙖 ${client.env.DISC_BOT_NAME} `)
        .setDescription(
          `𝙊𝙡𝙖́ 𝙢𝙖𝙣𝙖̃  🌈 𝙚𝙪 𝙨𝙤𝙪 𝙖 ${this.client.env.DISC_BOT_NAME} ♪ 𝙥𝙖𝙧𝙖 𝙤𝙗𝙩𝙚𝙧 𝙖𝙟𝙪𝙙𝙖𝙧 𝙖𝙟𝙪𝙙𝙖 𝙚 𝙙𝙞𝙫𝙚𝙧𝙩𝙞𝙧 𝙘𝙤𝙢𝙖𝙣𝙙𝙤𝙨 𝙙𝙞𝙨𝙥𝙤𝙣𝙞́𝙫𝙚𝙞𝙨 𝙚 𝙛𝙖́𝙘𝙚𝙞𝙨 𝙙𝙚 𝙪𝙨𝙤. 𝙑𝙤𝙘𝙚̂ 𝙥𝙤𝙙𝙚 𝙪𝙨𝙖𝙧 \`${prefix}help <𝙘𝙤𝙢𝙢𝙖𝙣𝙙>\` 𝙥𝙖𝙧𝙖 𝙤𝙗𝙩𝙚𝙧 𝙖𝙟𝙪𝙙𝙖 𝙙𝙞𝙨𝙥𝙤𝙣𝙞́𝙫𝙚𝙡.`
        )
        .setFooter({ text: `𝙐𝙨𝙚 ${prefix}𝙝𝙚𝙡𝙥 <𝙘𝙤𝙢𝙢𝙖𝙣𝙙> 𝙥𝙖𝙧𝙖 𝙤𝙗𝙩𝙚𝙧 𝙖𝙟𝙪𝙙𝙖 🔧` })

      fildes.forEach((field) => helpEmbed.addFields(field))
      await ctx.sendMessage({ embeds: [helpEmbed] })
    } else {
      const command = this.client.commands.get(args[0].toLowerCase())
      if (!command)
        return await ctx.sendMessage({
          embeds: [
            client
              .embed()
              .setColor(client.color.red)
              .setDescription(`𝘾𝙤𝙢𝙖𝙣𝙙𝙤 \`${args[0]}\` 𝙣𝙖̃𝙤 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙖𝙙𝙤 💢`),
          ],
        })
      const e = this.client.embed()
      const helpEmbed = e
        .setColor(this.client.color.main)
        .setTitle(` ☎️ 𝘼𝙟𝙪𝙙𝙖 𝙙𝙖 ${this.client.env.DISC_BOT_NAME}: 𝘾𝙤𝙢𝙖𝙣𝙙𝙤 ${command.name}`)
        .setDescription(`** 📝 𝘿𝙚𝙨𝙘𝙧𝙞𝙘̧𝙖̃𝙤: ** ${command.description.content}
**𝙐𝙨𝙤:** ${prefix}${command.description.usage}
**𝙀𝙭𝙚𝙢𝙥𝙡𝙤𝙨:** ${command.description.examples.map((example: any) => `${prefix}${example}`).join(', ')}
**𝘼𝙩𝙖𝙡𝙝𝙤𝙨:** ${command.aliases.map((alias: any) => `\`${alias}\``).join(', ')}
**𝘾𝙖𝙩𝙚𝙜𝙤𝙧𝙞𝙖:** ${command.category}
**𝘾𝙤𝙤𝙡𝙙𝙤𝙬𝙣:** ${command.cooldown} 𝙨𝙚𝙘𝙤𝙣𝙙𝙨
**𝙋𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨:** ${
        command.permissions.user.length > 0
          ? command.permissions.user.map((perm: any) => `\`${perm}\``).join(', ')
          : '⛔ 𝙉𝙤𝙣𝙚'
      }
**𝙒𝙞𝙣𝙭 𝙋𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨:** ${command.permissions.client.map((perm: any) => `\`${perm}\``).join(', ')}
**𝙎𝙤𝙢𝙚𝙣𝙩𝙚 𝙙𝙚𝙨𝙚𝙣𝙫𝙤𝙡𝙫𝙚𝙙𝙤𝙧:** ${command.permissions.dev ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}
**𝙎𝙡𝙖𝙨𝙝 𝘾𝙤𝙢𝙖𝙣𝙙𝙤:** ${command.slashCommand ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}
**𝘼𝙧𝙜𝙨:** ${command.args ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}
**𝙋𝙡𝙖𝙮𝙚𝙧:** ${command.player.active ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}
**𝘿𝙅:** ${command.player.dj ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}
**𝘿𝙅 𝙋𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨:** ${command.player.dj_perm ? command.player.dj_perm : '⛔ 𝙉𝙤𝙣𝙚'}
**𝙑𝙤𝙯:** ${command.player.voice ? '𝙎𝙞𝙢' : '𝙉𝙖̃𝙤'}`)
      await ctx.sendMessage({ embeds: [helpEmbed] })
    }
  }
}

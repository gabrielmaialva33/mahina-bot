import { Command } from '#common/command'
import { Mahina } from '#common/mahina'
import { Context } from '#common/context'

export default class Ping extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'ping',
      description: {
        content: 'Mostra o ping da ＷｉｎｘＢｏｔ',
        examples: ['ping'],
        usage: 'ping',
      },
      category: 'general',
      aliases: ['pong'],
      cooldown: 3,
      args: false,
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: Mahina, ctx: Context): Promise<any> {
    const msg = await ctx.sendDeferMessage('Pinging...')

    const embed = client
      .embed()
      .setAuthor({ name: 'Pong 🏓', iconURL: this.client.user!.displayAvatarURL() })
      .setColor(this.client.color.main)
      .addFields([
        {
          name: 'Bot Latency',
          value: `\`\`\`ini\n[ ${msg!.createdTimestamp - ctx.createdTimestamp}ms ]\n\`\`\``,
          inline: true,
        },
        {
          name: 'API Latency',
          value: `\`\`\`ini\n[ ${Math.round(ctx.client.ws.ping)}ms ]\n\`\`\``,
          inline: true,
        },
      ])
      .setFooter({
        text: `𝙋𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙧 ${ctx.author!.tag}`,
        iconURL: ctx.author!.avatarURL({})!,
      })
      .setTimestamp()
    return await ctx.editMessage({ content: '', embeds: [embed] })
  }
}

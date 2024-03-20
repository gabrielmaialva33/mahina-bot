import { Command } from '#common/command'
import { BaseClient } from '#common/base_client'
import { Context } from '#common/context'

export default class Ping extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'ping',
      description: {
        content: `Mostra o ping da ${client.env.DISC_BOT_NAME}`,
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

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const msg = await ctx.sendDeferMessage('📡 𝙥𝙞𝙣𝙜𝙖𝙣𝙙𝙚..')

    const embed = client
      .embed()
      .setAuthor({ name: '𝙋𝙤𝙣𝙜 🏓', iconURL: this.client.user!.displayAvatarURL() })
      .setColor(this.client.color.main)
      .addFields([
        {
          name: '𝐁𝐨𝐭 𝐋𝐚𝐭𝐞𝐧𝐜𝐲',
          value: `\`\`\`ini\n[ ${msg!.createdTimestamp - ctx.createdTimestamp}ms ]\n\`\`\``,
          inline: true,
        },
        {
          name: '𝐀𝐏𝐈 𝐋𝐚𝐭𝐞𝐧𝐜𝐲',
          value: `\`\`\`ini\n[ ${Math.round(ctx.client.ws.ping)}ms ]\n\`\`\``,
          inline: true,
        },
      ])
      .setFooter({
        text: `𝙥𝙚𝙙𝙞𝙙𝙤 𝙥𝙤𝙧 ${ctx.author!.tag}`,
        iconURL: ctx.author!.avatarURL({})!,
      })
      .setTimestamp()

    return await ctx.editMessage({ content: '', embeds: [embed] })
  }
}

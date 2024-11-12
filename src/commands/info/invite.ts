import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Invite extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'invite',
      description: {
        content: 'cmd.invite.description',
        examples: ['invite'],
        usage: 'invite',
      },
      category: 'info',
      aliases: ['iv'],
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
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    const embed = this.client.embed()
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(ctx.locale('buttons.invite'))
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/api/oauth2/authorize?client_id=${client.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`
        ),
      new ButtonBuilder()
        .setLabel(ctx.locale('buttons.support'))
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/STXurwnZD5')
    )
    return await ctx.sendMessage({
      embeds: [
        embed.setColor(this.client.color.main).setDescription(ctx.locale('cmd.invite.content')),
      ],
      components: [row],
    })
  }
}

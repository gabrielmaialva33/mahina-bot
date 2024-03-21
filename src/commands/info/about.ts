import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'

export default class About extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'about',
      description: {
        content: `Mostra informações sobre ${client.env.DISC_BOT_NAME}`,
        examples: ['about'],
        usage: 'about',
      },
      category: 'info',
      aliases: ['ab', 'sobre'],
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
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    client.logger.info('about command used')

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(' 𝙄𝙣𝙫𝙞𝙩𝙚-𝙢𝙚 𝙥𝙖𝙧𝙖 𝙤 𝙨𝙚𝙪 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 🌺')
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/api/oauth2/authorize?client_id=${client.env.DISC_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`
        ),
      new ButtonBuilder()
        .setLabel('𝐂𝐥𝐮𝐛𝐞 𝐝𝐚𝐬 𝐖𝐢𝐧𝐱 🎡🔥')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/3PJ9CMgpBx')
    )

    const embed = this.client
      .embed()
      .setAuthor({
        name: this.client.env.DISC_BOT_NAME,
        iconURL: this.client.env.DISC_BOT_PROFILE,
      })
      .setThumbnail(this.client.env.DISC_BOT_THUMBNAIL)
      .setColor(this.client.color.main)
      .addFields([
        {
          name: '𝘿𝙤𝙣𝙤',
          value: '[Maia 𓆏](https://github.com/gabrielmaialva33)',
          inline: true,
        },
        {
          name: '𝙋𝙧𝙤𝙟𝙚𝙩𝙤',
          value: '[aqui](https://github.com/gabrielmaialva33/mahina-bot)',
          inline: true,
        },
        {
          name: '𝙎𝙪𝙥𝙤𝙧𝙩𝙚',
          value: '[aqui](https://discord.gg/VpUEBnCZQW)',
          inline: true,
        },
        {
          name: '\u200b',
          value: `𝙎𝙚𝙟𝙖 𝙛𝙚𝙡𝙞𝙯 🍁 𝙘𝙤𝙢 𝙦𝙪𝙚𝙢 𝙨𝙚𝙧 𝙛𝙚𝙡𝙞𝙯 𝙘𝙤𝙢 𝙫𝙤𝙘𝙚̂ 🌺`,
          inline: true,
        },
      ])

    return await ctx.sendMessage({
      content: '',
      embeds: [embed],
      components: [row],
    })
  }
}

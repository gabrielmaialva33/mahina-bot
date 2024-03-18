import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import { Command, Context, Mahina } from '#common/index'

export default class About extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'about',
      description: {
        content: 'Mostra informações sobre a ＷｉｎｘＢｏｔ',
        examples: ['about'],
        usage: 'about',
      },
      category: 'info',
      aliases: ['ab'],
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

  async run(client: Mahina, ctx: Context): Promise<any> {
    client.logger.info('About command used')
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(' 𝙄𝙣𝙫𝙞𝙩𝙚-𝙢𝙚 𝙥𝙖𝙧𝙖 𝙤 𝙨𝙚𝙪 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧  🍁')
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/api/oauth2/authorize?client_id=1022712928291532851&permissions=8&scope=bot%20applications.commands`
        ),
      new ButtonBuilder()
        .setLabel('𝙒𝙚𝙚𝙙 𝙊𝙛 𝙒𝙖𝙧𝙘𝙧𝙖𝙛𝙩  🍁')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/maconha')
    )

    const embed = this.client
      .embed()
      .setAuthor({
        name: 'ＷｉｎｘＢｏｔ',
        iconURL:
          'https://cdn.discordapp.com/attachments/695434003930415165/1216407776843006052/file-Ja2FXEN0aUsbESuXFJFfn5hl.png?ex=66098185&is=65f70c85&hm=c9348ea2ab56ed2ec6967eb82588e4231fcecb29e67d5433f471699ac384bb1b&',
      })
      .setThumbnail(
        'https://cdn.discordapp.com/attachments/695434003930415165/1216407776843006052/file-Ja2FXEN0aUsbESuXFJFfn5hl.png?ex=66098185&is=65f70c85&hm=c9348ea2ab56ed2ec6967eb82588e4231fcecb29e67d5433f471699ac384bb1b&'
      )
      .setColor(this.client.color.main)
      .addFields([
        {
          name: '𝙊𝙬𝙣𝙚𝙧',
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
          value: '[aqui](https://discord.gg/maconha)',
          inline: true,
        },
        {
          name: '\u200b',
          value: ` 𝙁𝙪𝙢𝙚 𝙢𝙪𝙞𝙩𝙖 𝙢𝙖𝙘𝙤𝙣𝙝𝙖 🍁`,
          inline: true,
        },
      ])
    return await ctx.sendMessage({
      content: '',
      embeds: [embed],
      components: [],
    })
  }
}

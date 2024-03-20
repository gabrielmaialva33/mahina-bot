import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import { Command, Context, BaseClient } from '#common/index'

export default class Invite extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'invite',
      description: {
        content: 'Envia o link de convite do bot',
        examples: ['invite'],
        usage: 'invite',
      },
      category: 'info',
      aliases: ['inv'],
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
    const clientId = client.env.DISC_CLIENT_ID
    if (!clientId) {
      this.client.logger.error(
        'Client ID not found in environment variables, cannot generate invite link.'
      )
      return await ctx.sendMessage(
        '🥺 𝘿𝙚𝙨𝙘𝙪𝙡𝙥𝙚, 𝙢𝙚𝙪 𝙡𝙞𝙣𝙠 𝙙𝙚 𝙘𝙤𝙣𝙫𝙞𝙩𝙚 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙙𝙞𝙨𝙥𝙤𝙣𝙞́𝙫𝙚𝙡 𝙣𝙤 𝙢𝙤𝙢𝙚𝙣𝙩𝙤. 𝙋𝙤𝙧 𝙛𝙖𝙫𝙤𝙧, 𝙙𝙞𝙜𝙖 𝙖𝙤 𝙗𝙪𝙧𝙧𝙚 𝙙𝙤 𝙈𝙖𝙞𝙖 𝙥𝙖𝙧𝙖 𝙫𝙚𝙧𝙞𝙛𝙞𝙘𝙖𝙧 𝙨𝙚𝙪 𝙘𝙤𝙣𝙨𝙤𝙡𝙚.'
      )
    }

    const embed = this.client.embed()
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📩 𝘾𝙤𝙣𝙫𝙞𝙩𝙚')
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`
        ),
      new ButtonBuilder()
        .setLabel('𝐂𝐥𝐮𝐛𝐞 𝐝𝐚𝐬 𝐖𝐢𝐧𝐱 🎡🔥')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/3PJ9CMgpBx')
    )

    return await ctx.sendMessage({
      embeds: [
        embed
          .setColor(this.client.color.main)
          .setDescription(
            `𝙈𝙖𝙣𝙖̃ 🥺 𝙥𝙤𝙙𝙚 𝙢𝙚 𝙘𝙤𝙣𝙫𝙞𝙙𝙖𝙧 𝙘𝙡𝙞𝙘𝙖𝙣𝙙𝙤 𝙣𝙤 𝙗𝙤𝙩𝙖̃𝙤 𝙖𝙗𝙖𝙞𝙭𝙤. 𝘼𝙡𝙜𝙪𝙢 𝙗𝙪𝙜 🐞 𝙤𝙪 𝙞𝙣𝙩𝙚𝙧𝙧𝙪𝙥𝙘̧𝙖̃𝙤? 🆘 𝙅𝙪𝙣𝙩𝙚-𝙨𝙚 𝙖𝙤 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙙𝙚 𝙨𝙪𝙥𝙤𝙧𝙩𝙚!`
          ),
      ],
      components: [row],
    })
  }
}

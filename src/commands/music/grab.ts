import { Command, Context, Mahina } from '#common/index'

export default class Grab extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'grab',
      description: {
        content: 'Pega a música que está tocando e envia no seu privado',
        examples: ['grab'],
        usage: 'grab',
      },
      category: 'music',
      aliases: [],
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: true,
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
    const embed = client.embed().setColor(client.color.main)
    let player = client.queue.get(ctx.guild!.id)
    let song = player.current

    try {
      const dm = client
        .embed()
        .setTitle(`**${song!.info.title}**`)
        .setURL(song!.info.uri!)
        .setThumbnail(song!.info.artworkUrl!)
        .setDescription(
          `**𝘿𝙪𝙧𝙖𝙘̧𝙖̃𝙤:** ${
            song!.info.isStream ? '🔴 𝙇𝙄𝙑𝙀' : client.utils.formatTime(song!.info.length)
          }\n**𝙋𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚:** ${song!.info.requestedBy}\n**𝙇𝙞𝙣𝙠:** [𝙘𝙡𝙞𝙦𝙪𝙚 𝙖𝙠𝙞](${song!.info.uri})`
        )
        .setColor(client.color.main)
      await ctx.author!.send({ embeds: [dm] })
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`**𝙏𝙚 𝙢𝙖𝙣𝙙𝙚𝙞 𝙪𝙢 𝙋𝙑.**`).setColor(client.color.green)],
      })
    } catch (e) {
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`**𝙉𝙖̃𝙤 𝙘𝙤𝙣𝙨𝙚𝙜𝙪𝙞 𝙩𝙚 𝙚𝙣𝙫𝙞𝙖𝙧 𝙋𝙑.**`).setColor(client.color.red)],
      })
    }
  }
}

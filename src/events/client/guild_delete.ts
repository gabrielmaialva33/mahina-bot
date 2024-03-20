import { EmbedBuilder, Guild, GuildMember, TextChannel } from 'discord.js'

import { Event, Mahina } from '#common/index'

export default class GuildDelete extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'guildDelete' })
  }

  async run(guild: Guild): Promise<any> {
    let owner: GuildMember | undefined
    try {
      owner = guild.members.cache.get(guild?.ownerId)
    } catch (e) {
      owner = await guild.fetchOwner()
    }
    if (!owner) owner = { user: { tag: 'Unknown#0000' } } as GuildMember

    const embed = new EmbedBuilder()
      .setColor(this.client.color.red)
      .setAuthor({
        name: guild.name || '𝐆𝐮𝐢𝐥𝐝 𝐃𝐞𝐬𝐜𝐨𝐧𝐡𝐞𝐜𝐢𝐝𝐚',
        iconURL: guild.iconURL({ extension: 'jpeg' })!,
      })

      .setDescription(`**${guild.name}** 𝙛𝙤𝙞 𝙧𝙚𝙢𝙤𝙫𝙞𝙙𝙖 𝙙𝙖𝙨 𝙢𝙞𝙣𝙝𝙖𝙨 𝙜𝙪𝙞𝙡𝙙𝙖𝙨!`)
      .setThumbnail(guild.iconURL({ extension: 'jpeg' }))
      .addFields(
        { name: '𝐃𝐨𝐧𝐨', value: owner.user.tag, inline: true },
        {
          name: '𝐌𝐞𝐦𝐛𝐫𝐨𝐬',
          value: guild.memberCount ? guild.memberCount.toString() : '𝐧𝐨𝐧𝐞',
          inline: true,
        },
        {
          name: '𝐂𝐫𝐢𝐚𝐝𝐚 𝐞𝐦',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: '𝐑𝐞𝐦𝐨𝐯𝐢𝐝𝐚 𝐞𝐦',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
        { name: '𝐈𝐃', value: guild.id, inline: true }
      )
      .setTimestamp()
    const channel = (await this.client.channels.fetch(
      this.client.env.DISC_LOG_CHANNEL_ID
    )) as TextChannel
    if (!channel) return

    return await channel.send({ embeds: [embed] })
  }
}

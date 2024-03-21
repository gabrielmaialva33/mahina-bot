import { EmbedBuilder, Guild, GuildMember, TextChannel } from 'discord.js'

import { BaseClient, Event } from '#common/index'

export default class GuildCreate extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'guildCreate' })
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
      .setColor(this.client.color.green)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ extension: 'jpeg' })! })
      .setDescription(`**${guild.name}** 𝙛𝙤𝙞 𝙖𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙤 𝙖̀𝙨 𝙢𝙞𝙣𝙝𝙖𝙨 𝙜𝙪𝙞𝙡𝙙𝙖𝙨..`)
      .setThumbnail(guild.iconURL({ extension: 'jpeg' }))
      .addFields(
        { name: '𝐃𝐨𝐧𝐨', value: owner.user.tag, inline: true },
        { name: '𝐌𝐞𝐦𝐛𝐫𝐨𝐬', value: guild.memberCount.toString(), inline: true },
        {
          name: '𝐂𝐫𝐢𝐚𝐝𝐚 𝐞𝐦',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          inline: true,
        },
        {
          name: '𝐄𝐧𝐭𝐫𝐨𝐮 𝐞𝐦',
          value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:F>`,
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

import { BaseClient, Command, Context } from '#common/index'

export default class Stats extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'stats',
      description: {
        content: `Mostra as estatísticas da ${client.env.DISC_BOT_NAME}`,
        examples: ['stats'],
        usage: 'stats',
      },
      category: 'info',
      aliases: ['st'],
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
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    const embed = this.client.embed()
    embed.setTitle(`📊 ${this.client.env.DISC_BOT_NAME} Ｓｔａｔｓ`)
    embed.setColor(this.client.color.main)
    embed.setThumbnail(this.client.user!.avatarURL({}))
    embed.setTimestamp()
    client.shoukaku.nodes.forEach((node) => {
      try {
        embed.addFields({
          name: '𝐍𝐨𝐦𝐞',
          value: `${node.name} (${node.stats ? '🟢' : '🔴'})`,
        })
        embed.addFields({ name: '𝐏𝐥𝐚𝐲𝐞𝐫', value: `${node.stats?.players}` })
        embed.addFields({ name: '𝐏𝐥𝐚𝐲𝐞𝐫𝐬', value: `${node.stats?.playingPlayers}` })
        embed.addFields({
          name: '⏳ 𝐓𝐞𝐦𝐩𝐨 𝐝𝐞 𝐚𝐭𝐢𝐯𝐢𝐝𝐚𝐝𝐞',
          value: `${client.utils.formatTime(node.stats?.uptime || 0)}`,
        })
        embed.addFields({ name: '🖥️ 𝙉𝙪𝙘𝙡𝙚𝙤𝙨', value: `${node.stats?.cpu.cores + ' 𝐜𝐨𝐫𝐞𝐬'}` })
        embed.addFields({
          name: '💾 𝐔𝐬𝐨 𝐝𝐚 𝐦𝐞𝐦𝐨́𝐫𝐢𝐚',
          value: `${client.utils.formatBytes(
            node.stats?.memory?.used || 1
          )}/${client.utils.formatBytes(node.stats?.memory?.reservable || 1)}`,
        })
        embed.addFields({
          name: '🖲 𝐒𝐲𝐬𝐭𝐞𝐦 𝐋𝐨𝐚𝐝',
          value: `${(Math.round((node.stats?.cpu.systemLoad || 1) * 100) / 100).toFixed(2)}%`,
        })
        embed.addFields({
          name: '🤖 𝐂𝐏𝐔 𝐋𝐨𝐚𝐝',
          value: `${(Math.round((node.stats?.cpu.lavalinkLoad || 1) * 100) / 100).toFixed(2)}%`,
        })
      } catch (e) {
        this.client.logger.error(e)
      }
    })

    return await ctx.sendMessage({ embeds: [embed] })
  }
}

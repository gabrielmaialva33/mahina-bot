import { Command, Context, Mahina } from '#common/index'

export default class Stats extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'stats',
      description: {
        content: 'Mostra as estatísticas da ＷｉｎｘＢｏｔ',
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
  async run(client: Mahina, ctx: Context): Promise<any> {
    const embed = this.client.embed()
    embed.setTitle('📊 ＷｉｎｘＢｏｔ Ｓｔａｔｓ')
    embed.setColor(this.client.color.main)
    embed.setThumbnail(this.client.user!.avatarURL({}))
    embed.setTimestamp()
    client.shoukaku.nodes.forEach((node) => {
      try {
        embed.addFields({
          name: '𝙉𝙖𝙢𝙚',
          value: `${node.name} (${node.stats ? '🟢' : '🔴'})`,
        })
        embed.addFields({ name: '𝙋𝙡𝙖𝙮𝙚𝙧', value: `${node.stats?.players}` })
        embed.addFields({ name: '𝙋𝙡𝙖𝙮 𝙋𝙡𝙖𝙮𝙚𝙧𝙨', value: `${node.stats?.playingPlayers}` })
        embed.addFields({
          name: '⏳ 𝙏𝙚𝙢𝙥𝙤 𝙙𝙚 𝙖𝙩𝙞𝙫𝙞𝙙𝙖𝙙𝙚',
          value: `${client.utils.formatTime(node.stats?.uptime || 0)}`,
        })
        embed.addFields({ name: '🖥️ 𝙉𝙪𝙘𝙡𝙚𝙤𝙨', value: `${node.stats?.cpu.cores + ' 𝙘𝙤𝙧𝙚(𝙨)'}` })
        embed.addFields({
          name: '💾 𝙐𝙨𝙤 𝙙𝙚 𝙢𝙚𝙢𝙤́𝙧𝙞𝙖',
          value: `${client.utils.formatBytes(
            node.stats?.memory?.used || 1
          )}/${client.utils.formatBytes(node.stats?.memory?.reservable || 1)}`,
        })
        embed.addFields({
          name: '🖲 𝙎𝙮𝙨𝙩𝙚𝙢 𝙇𝙤𝙖𝙙',
          value: `${(Math.round((node.stats?.cpu.systemLoad || 1) * 100) / 100).toFixed(2)}%`,
        })
        embed.addFields({
          name: '🤖 Ｗｉｎｘ 𝙇𝙤𝙖𝙙',
          value: `${(Math.round((node.stats?.cpu.lavalinkLoad || 1) * 100) / 100).toFixed(2)}%`,
        })
      } catch (e) {
        console.log(e)
      }
    })
    return await ctx.sendMessage({ embeds: [embed] })
  }
}

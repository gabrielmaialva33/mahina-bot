import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class LavaLink extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'lavalink',
      description: {
        content: 'cmd.lavalink.description',
        examples: ['lavalink'],
        usage: 'lavalink',
      },
      category: 'info',
      aliases: ['ll'],
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
    const nodes = client.manager.nodeManager.nodes
    const nodesPerPage = 2

    const nodeArray = Array.from(nodes.values())
    const chunks = client.utils.chunk(nodeArray, nodesPerPage)

    if (chunks.length === 0) chunks.push(nodeArray)

    const pages = chunks.map((chunk: any[], index: number) => {
      const embed = this.client
        .embed()
        .setTitle(ctx.locale('cmd.lavalink.title'))
        .setColor(this.client.color.main)
        .setThumbnail(client.user?.avatarURL()!)
        .setTimestamp()

      chunk.forEach((node) => {
        const statusEmoji = node.stats ? '🟢' : '🔴'
        const stats = node.stats || {
          players: 0,
          playingPlayers: 0,
          uptime: 0,
          cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
          memory: { used: 0, reservable: 0 },
        }

        embed.addFields({
          name: `${node.name} (${statusEmoji})`,
          value: `\`\`\`yaml\n${ctx.locale('cmd.lavalink.content', {
            players: stats.players,
            playingPlayers: stats.playingPlayers,
            uptime: client.utils.formatTime(stats.uptime),
            cores: stats.cpu.cores,
            used: client.utils.formatBytes(stats.memory.used),
            reservable: client.utils.formatBytes(stats.memory.reservable),
            systemLoad: (stats.cpu.systemLoad * 100).toFixed(2),
            lavalinkLoad: (stats.cpu.lavalinkLoad * 100).toFixed(2),
          })}\n\`\`\``,
        })
      })

      embed.setFooter({
        text: ctx.locale('cmd.lavalink.page_info', {
          index: index + 1,
          total: chunks.length,
        }),
      })

      return embed
    })
    return await client.utils.paginate(client, ctx, pages)
  }
}

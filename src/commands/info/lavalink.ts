import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import type { LavalinkNodeSnapshot } from '#src/services/lavalink_health_service'

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

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    const nodes = client.manager.nodeManager.nodes
    const nodesPerPage = 2

    const healthService = client.services.lavalinkHealth
    const runtimeSummary = healthService?.getRuntimeSummary()
    const snapshotMap = new Map(
      (healthService?.getNodeSnapshots() || []).map((snapshot) => [snapshot.id, snapshot])
    )
    const nodeArray = Array.from(nodes.values())
    const chunks = client.utils.chunk(nodeArray, nodesPerPage)

    if (chunks.length === 0) chunks.push(nodeArray)

    const pages = chunks.map((chunk, index) => {
      const embed = this.client
        .embed()
        .setTitle(ctx.locale('cmd.lavalink.title'))
        .setColor(this.client.color.main)
        .setThumbnail(client.user?.avatarURL()!)
        .setTimestamp()

      if (runtimeSummary) {
        embed.setDescription(
          ctx.locale('cmd.lavalink.runtime_overview', {
            healthy: runtimeSummary.healthyNodes,
            total: runtimeSummary.totalNodes,
            players: runtimeSummary.totalPlayers,
            playing: runtimeSummary.totalPlayingPlayers,
            reconnecting: runtimeSummary.reconnectingNodes,
          })
        )
      }

      chunk.forEach((node) => {
        const snapshot = snapshotMap.get(node.id) || createFallbackSnapshot(node.id)

        embed.addFields({
          name: ctx.locale('cmd.lavalink.node_title', {
            id: node.id,
            status: ctx.locale(`cmd.lavalink.status.${snapshot.status}`),
          }),
          value: [
            ctx.locale('cmd.lavalink.metrics.players', {
              value: snapshot.players,
              active: snapshot.playingPlayers,
            }),
            ctx.locale('cmd.lavalink.metrics.uptime', {
              value: client.utils.formatTime(snapshot.uptime),
            }),
            ctx.locale('cmd.lavalink.metrics.memory', {
              used: client.utils.formatBytes(snapshot.memoryUsed),
              total: client.utils.formatBytes(snapshot.memoryReservable),
            }),
            ctx.locale('cmd.lavalink.metrics.cpu', {
              cores: snapshot.cpuCores,
              system: (snapshot.systemLoad * 100).toFixed(2),
              lavalink: (snapshot.lavalinkLoad * 100).toFixed(2),
            }),
            ctx.locale('cmd.lavalink.metrics.retries', {
              value: snapshot.reconnectAttempts,
            }),
          ].join('\n'),
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

    await client.utils.paginate(client, ctx, pages)
  }
}

function createFallbackSnapshot(id: string): LavalinkNodeSnapshot {
  return {
    id,
    status: 'down',
    players: 0,
    playingPlayers: 0,
    uptime: 0,
    cpuCores: 0,
    systemLoad: 0,
    lavalinkLoad: 0,
    memoryUsed: 0,
    memoryReservable: 0,
    reconnectAttempts: 0,
  }
}

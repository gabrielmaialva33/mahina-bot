import os from 'node:os'
import { version } from 'discord.js'

// @ts-ignore
import { showTotalMemory, usagePercent } from 'node-system-stats'

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Botinfo extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'botinfo',
      description: {
        content: 'cmd.botinfo.description',
        examples: ['botinfo'],
        usage: 'botinfo',
      },
      category: 'info',
      aliases: ['bi', 'info', 'stats', 'status'],
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
    const osInfo = `${os.type()} ${os.release()}`
    const osUptime = client.utils.formatTime(os.uptime())
    const osHostname = os.hostname()
    const cpuInfo = `${os.arch()} (${os.cpus().length} cores)`
    const cpuUsage = await usagePercent({ coreIndex: 0, sampleMs: 2000 })
    const cpuUsed = cpuUsage.percent
    const memTotal = showTotalMemory(true)
    const memUsed = (process.memoryUsage().rss / 1024 ** 2).toFixed(2)
    const nodeVersion = process.version
    const discordJsVersion = version
    const commands = client.commands.size

    const promises = [
      client.shard?.broadcastEval((c) => c.guilds.cache.size),
      client.shard?.broadcastEval((c) =>
        c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
      ),
      client.shard?.broadcastEval((c) => c.channels.cache.size),
    ]
    const results = await Promise.all(promises)
    const guilds = results[0]?.reduce((acc, guildCount) => acc + guildCount, 0) || 0
    const users = results[1]?.reduce((acc, memberCount) => acc + memberCount, 0) || 0
    const channels = results[2]?.reduce((acc, channelCount) => acc + channelCount, 0) || 0

    const embed = this.client
      .embed()
      .setColor(this.client.color.main)
      .setTitle(ctx.locale('cmd.botinfo.title'))
      .addFields(
        {
          name: ctx.locale('cmd.botinfo.fields.runtime'),
          value: ctx.locale('cmd.botinfo.runtime', {
            osInfo,
            osUptime,
            osHostname,
            nodeVersion,
            discordJsVersion,
          }),
          inline: false,
        },
        {
          name: ctx.locale('cmd.botinfo.fields.resources'),
          value: ctx.locale('cmd.botinfo.resources', {
            cpuInfo,
            cpuUsed,
            memUsed,
            memTotal,
          }),
          inline: false,
        },
        {
          name: ctx.locale('cmd.botinfo.fields.scale'),
          value: ctx.locale('cmd.botinfo.scale', {
            guilds,
            channels,
            users,
            commands,
          }),
          inline: false,
        }
      )

    await ctx.sendMessage({
      embeds: [embed],
    })
  }
}

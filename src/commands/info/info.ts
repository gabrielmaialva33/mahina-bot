import os from 'node:os'

import { version } from 'discord.js'

import { Command } from '#common/command'
import { Mahina } from '#common/mahina'
import { Context } from '#common/context'

export default class Info extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'info',
      description: {
        content: 'Information about the bot',
        examples: ['info'],
        usage: 'info',
      },
      category: 'info',
      aliases: ['botinfo', 'bi'],
      cooldown: 3,
      args: false,
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
    const osType = os.type()
    const osRelease = os.release()
    const osHostname = os.hostname()
    const cpuArch = os.arch()
    const cpuCores = os.cpus().length
    const nodeVersion = process.version
    const discordJsVersion = version
    const botGuilds = client.guilds.cache.size
    const botChannels = client.channels.cache.size
    const botUsers = client.users.cache.size
    const botCommands = client.commands.size

    const botInfo = `Bot Information:
- **Operating System**: ${osType} ${osRelease}
- **Hostname**: ${osHostname}
- **CPU Architecture**: ${cpuArch} (${cpuCores} cores)
- **Node Version**: ${nodeVersion}
- **Discord Version**: ${discordJsVersion}
- **Connected to** ${botGuilds} guilds, ${botChannels} channels, and ${botUsers} users
- **Total Commands**: ${botCommands}
  `

    const embed = this.client.embed()
    return await ctx.sendMessage({
      embeds: [embed.setColor(this.client.color.main).setDescription(botInfo)],
    })
  }
}

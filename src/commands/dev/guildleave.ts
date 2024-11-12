import { ChannelType, type TextChannel } from 'discord.js'
import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class GuildLeave extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'guildleave',
      description: {
        content: 'Leave a guild',
        examples: ['guildleave <guildId>'],
        usage: 'guildleave <guildId>',
      },
      category: 'dev',
      aliases: ['gl'],
      cooldown: 3,
      args: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: true,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: false,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const guildId = args[0]

    const guild = await client.shard
      ?.broadcastEval(
        (c, { guildId: gId }) => {
          const g = c.guilds.cache.get(gId)
          return g ? { id: g.id, name: g.name } : null
        },
        { context: { guildId } }
      )
      .then((results) => results.find((g) => g !== null))

    if (!guild) {
      return await ctx.sendMessage('Guild not found.')
    }

    try {
      await client.shard?.broadcastEval(
        async (c, { guildId: gId }) => {
          const g = c.guilds.cache.get(gId)
          if (g) {
            await g.leave()
          }
        },
        { context: { guildId } }
      )
      await ctx.sendMessage(`Left guild ${guild.name}`)
    } catch {
      await ctx.sendMessage(`Failed to leave guild ${guild.name}`)
    }

    const logChannelId = process.env.LOG_CHANNEL_ID
    if (logChannelId) {
      const logChannel = client.channels.cache.get(logChannelId) as TextChannel
      if (logChannel && logChannel.type === ChannelType.GuildText) {
        await logChannel.send(`Bot has left guild: ${guild.name} (ID: ${guild.id})`)
      }
    }
  }
}

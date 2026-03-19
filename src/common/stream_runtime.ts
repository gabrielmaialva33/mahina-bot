import type Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import type { EmbedBuilder } from 'discord.js'

export function ensureStreamRuntime(client: MahinaBot): string | null {
  if (!client.runtime.selfbot) {
    return null
  }

  if (!client.selfbot.isReady()) {
    return null
  }

  return null
}

export async function ensureStreamCommandReady(client: MahinaBot, ctx: Context): Promise<boolean> {
  if (client.runtime.selfbot && client.selfbot.isReady()) {
    return true
  }

  await ctx.sendMessage({
    embeds: [
      {
        title: ctx.locale('cmd.stream_runtime.title'),
        description: client.runtime.selfbot
          ? ctx.locale('cmd.stream_runtime.not_ready')
          : ctx.locale('cmd.stream_runtime.disabled'),
        color: client.config.color.red,
      },
    ],
  })

  return false
}

export function createStreamStatusEmbed(
  client: MahinaBot,
  ctx: Context,
  title: string,
  description?: string
): EmbedBuilder {
  const embed = client.embed().setColor(client.color.main).setTitle(title)

  if (description) {
    embed.setDescription(description)
  }

  if (ctx.author) {
    embed.setFooter({
      text: ctx.locale('player.trackStart.requested_by', { user: ctx.author.username }),
      iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
    })
  }

  return embed.setTimestamp()
}

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'

export default class MSkip extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mskip',
      description: {
        content: 'cmd.mskip.description',
        examples: ['mskip'],
        usage: 'mskip',
      },
      category: 'stream',
      aliases: ['msk'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const queue = client.selfbot.getQueue(ctx.guild.id)
    if (!queue?.current) {
      return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    }

    const skipped = await client.selfbot.skipTrack(ctx.guild.id, ctx.member)
    if (!skipped) return

    if (ctx.isInteraction) {
      const embed = createStreamStatusEmbed(
        client,
        ctx,
        ctx.locale('cmd.mskip.messages.title'),
        ctx.locale('cmd.mskip.messages.skipped', {
          title: skipped.title,
          uri: skipped.url || '',
        })
      )

      await ctx.sendMessage({ embeds: [embed] })
      return
    }

    await ctx.message?.react('👍')
  }
}

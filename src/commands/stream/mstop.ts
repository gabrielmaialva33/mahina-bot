import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'

export default class MStop extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mstop',
      description: {
        content: 'cmd.mstop.description',
        examples: ['mstop'],
        usage: 'mstop',
      },
      category: 'stream',
      aliases: ['ms'],
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
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'Connect', 'Speak'],
        user: [],
      },
      slashCommand: true,
    })
  }

  async run(client: MahinaBot, ctx: Context, _args: string[]): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    client.selfbot.stopStream(ctx.guild.id)

    const embed = createStreamStatusEmbed(client, ctx, ctx.locale('cmd.mstop.messages.success'))

    await ctx.sendMessage({ embeds: [embed] })
  }
}

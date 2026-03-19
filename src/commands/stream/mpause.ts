import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'

export default class MPause extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mpause',
      description: {
        content: 'cmd.mpause.description',
        examples: ['mpause'],
        usage: 'mpause',
      },
      category: 'stream',
      aliases: ['mpa'],
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
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    client.selfbot.pauseStream(ctx.guild.id)

    const embed = createStreamStatusEmbed(
      client,
      ctx,
      ctx.locale('cmd.mpause.messages.title'),
      ctx.locale('cmd.mpause.messages.paused_description')
    )

    await ctx.sendMessage({ embeds: [embed] })
  }
}

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { createStreamStatusEmbed, ensureStreamCommandReady } from '#common/stream_runtime'

export default class MResume extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mresume',
      description: {
        content: 'cmd.mresume.description',
        examples: ['mresume'],
        usage: 'mresume',
      },
      category: 'stream',
      aliases: ['mr'],
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

    client.selfbot.resumeStream(ctx.guild.id)

    const embed = createStreamStatusEmbed(
      client,
      ctx,
      ctx.locale('cmd.mresume.messages.resumed'),
      ctx.locale('cmd.mresume.messages.description')
    )

    await ctx.sendMessage({ embeds: [embed] })
  }
}

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'
import { ensureStreamCommandReady } from '#common/stream_runtime'

export default class MLoop extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'mloop',
      description: {
        content: 'cmd.mloop.description',
        examples: ['mloop'],
        usage: 'mloop',
      },
      category: 'stream',
      aliases: ['mlp'],
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

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    if (!ctx.guild || !ctx.member || !ctx.author) return
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const queue = client.selfbot.getQueue(ctx.guild.id)
    if (!queue?.current) {
      return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    }

    const newMode = queue.cycleLoop()

    const modeKeys: Record<string, string> = {
      off: 'cmd.mloop.messages.looping_off',
      track: 'cmd.mloop.messages.looping_track',
      queue: 'cmd.mloop.messages.looping_queue',
    }

    const embed = this.client
      .embed()
      .setColor(this.client.color.main)
      .setDescription(ctx.locale(modeKeys[newMode]))

    return await ctx.sendMessage({ embeds: [embed] })
  }
}

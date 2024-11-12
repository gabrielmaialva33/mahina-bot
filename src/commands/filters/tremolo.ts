import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Tremolo extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'tremolo',
      description: {
        content: 'cmd.tremolo.description',
        examples: ['tremolo'],
        usage: 'tremolo',
      },
      category: 'filters',
      aliases: ['tr'],
      cooldown: 3,
      args: false,
      vote: false,
      player: {
        voice: true,
        dj: true,
        active: true,
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

  async run(client: MahinaBot, ctx: Context): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    const tremoloEnabled = player.filterManager.filters.tremolo

    if (tremoloEnabled) {
      player.filterManager.toggleTremolo()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.tremolo.messages.disabled'),
            color: this.client.color.main,
          },
        ],
      })
    } else {
      player.filterManager.toggleTremolo()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.tremolo.messages.enabled'),
            color: this.client.color.main,
          },
        ],
      })
    }
  }
}

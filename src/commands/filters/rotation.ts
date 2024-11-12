import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Rotation extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'rotation',
      description: {
        content: 'cmd.rotation.description',
        examples: ['rotation'],
        usage: 'rotation',
      },
      category: 'filters',
      aliases: ['rt'],
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
    if (player.filterManager.filters.rotation) {
      player.filterManager.toggleRotation()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.rotation.messages.disabled'),
            color: this.client.color.main,
          },
        ],
      })
    } else {
      player.filterManager.toggleRotation()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.rotation.messages.enabled'),
            color: this.client.color.main,
          },
        ],
      })
    }
  }
}

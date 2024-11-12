import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Karaoke extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'karaoke',
      description: {
        content: 'cmd.karaoke.description',
        examples: ['karaoke'],
        usage: 'karaoke',
      },
      category: 'filters',
      aliases: ['kk'],
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
    const filterEnabled = player.filterManager.filters.karaoke

    if (filterEnabled) {
      await player.filterManager.toggleKaraoke()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.karaoke.messages.filter_disabled'),
            color: this.client.color.main,
          },
        ],
      })
    } else {
      await player.filterManager.toggleKaraoke()
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.karaoke.messages.filter_enabled'),
            color: this.client.color.main,
          },
        ],
      })
    }
  }
}

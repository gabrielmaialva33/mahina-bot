import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Skip extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'skip',
      description: {
        content: 'cmd.skip.description',
        examples: ['skip'],
        usage: 'skip',
      },
      category: 'music',
      aliases: ['sk'],
      cooldown: 3,
      args: false,
      vote: true,
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
    const embed = this.client.embed()
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    if (player.queue.tracks.length === 0) {
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription(ctx.locale('player.errors.no_song')),
        ],
      })
    }
    const currentTrack = player.queue.current?.info
    player.skip()
    if (ctx.isInteraction) {
      return await ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.main).setDescription(
            ctx.locale('cmd.skip.messages.skipped', {
              title: currentTrack?.title,
              uri: currentTrack?.uri,
            })
          ),
        ],
      })
    }
    ctx.message?.react('👍')
  }
}

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Rate extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'rate',
      description: {
        content: 'cmd.rate.description',
        examples: ['rate 1', 'rate 1.5', 'rate 1,5'],
        usage: 'rate <number>',
      },
      category: 'filters',
      aliases: ['rt'],
      cooldown: 3,
      args: true,
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
      options: [
        {
          name: 'rate',
          description: 'cmd.rate.options.rate',
          type: 3,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id)
    if (!player) return await ctx.sendMessage(ctx.locale('event.message.no_music_playing'))
    const rateString = args[0].replace(',', '.')
    const isValidNumber = /^[0-9]*\.?[0-9]+$/.test(rateString)
    const rate = Number.parseFloat(rateString)

    if (!isValidNumber || Number.isNaN(rate) || rate < 0.5 || rate > 5) {
      await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale('cmd.rate.errors.invalid_number'),
            color: this.client.color.red,
          },
        ],
      })
      return
    }

    await player.filterManager.setRate(rate)
    await ctx.sendMessage({
      embeds: [
        {
          description: ctx.locale('cmd.rate.messages.rate_set', {
            rate,
          }),
          color: this.client.color.main,
        },
      ],
    })
  }
}

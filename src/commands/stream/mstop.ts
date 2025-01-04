import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

import { T } from '#common/i18n'

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

  async run(client: MahinaBot, ctx: Context, _args: string[]): Promise<any> {
    if (!ctx.guild || !ctx.member || !ctx.author) return

    const locale = await client.db.getLanguage(ctx.guild.id)

    this.client.selfbot.streamer.stopStream()
    this.client.selfbot.streamer.leaveVoice()

    const embed = this.client
      .embed()
      .setColor(client.color.main)
      .setTitle(T(locale, 'cmd.mstop.messages.success'))
      .setFooter({
        text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
        iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
      })
      .setTimestamp()

    return ctx.sendMessage({ embeds: [embed] })
  }
}

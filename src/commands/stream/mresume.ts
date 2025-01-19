import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'

import { T } from '#common/i18n'

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

    const locale = await client.db.getLanguage(ctx.guild.id)

    client.selfbot.resumeStream()

    const embed = this.client
      .embed()
      .setColor(client.color.main)
      .setTitle(T(locale, 'cmd.mresume.messages.resumed'))
      .setDescription(T(locale, 'cmd.mresume.description'))
      .setFooter({
        text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
        iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
      })
      .setTimestamp()

    await ctx.sendMessage({ embeds: [embed] })
  }
}

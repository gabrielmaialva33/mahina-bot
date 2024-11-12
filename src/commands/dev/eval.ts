import util from 'node:util'
import { fetch } from 'undici'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Eval extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'eval',
      description: {
        content: 'Evaluate code',
        examples: ['eval'],
        usage: 'eval',
      },
      category: 'dev',
      aliases: ['ev'],
      cooldown: 3,
      args: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: true,
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: false,
      options: [],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    const code = args.join(' ')
    try {
      // eslint-disable-next-line no-eval
      let evaled = eval(code)
      if (evaled === client.config) evaled = 'Nice try'

      if (typeof evaled !== 'string') evaled = util.inspect(evaled)
      if (evaled.length > 2000) {
        const response = await fetch('https://hasteb.in/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: evaled,
        })
        const json: any = await response.json()
        evaled = `https://hasteb.in/${json.key}`
        return await ctx.sendMessage({
          content: evaled,
        })
      }

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel('Delete')
        .setCustomId('eval-delete')
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

      const msg = await ctx.sendMessage({
        content: `\`\`\`js\n${evaled}\n\`\`\``,
        components: [row],
      })

      const filter = (i: any) => i.customId === 'eval-delete' && i.user.id === ctx.author?.id
      const collector = msg.createMessageComponentCollector({
        time: 60000,
        filter: filter,
      })

      collector.on('collect', async (i) => {
        await i.deferUpdate()
        await msg.delete()
      })
    } catch (e) {
      await ctx.sendMessage(`\`\`\`js\n${e}\n\`\`\``)
    }
  }
}

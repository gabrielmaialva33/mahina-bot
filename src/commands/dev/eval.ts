import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { fetch } from 'undici'

import { Command, Context, Mahina } from '#common/index'

export default class Eval extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'eval',
      description: {
        content: 'Executa um código',
        examples: ['eval'],
        usage: 'eval',
      },
      category: 'dev',
      aliases: ['ev'],
      cooldown: 3,
      args: false,
      player: {
        voice: false,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: true,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: false,
      options: [],
    })
  }

  async run(client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const code = args.join(' ')
    try {
      // eslint-disable-next-line no-eval
      let evaded = eval(code)
      if (evaded === client.env) evaded = 'Nice try'

      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel('Delete')
        .setCustomId('eval-delete')
      const row = new ActionRowBuilder().addComponents(button)

      // eslint-disable-next-line unicorn/no-await-expression-member
      if (typeof evaded !== 'string') evaded = (await import('node:util')).inspect(evaded)

      if (evaded.length > 2000) {
        const response = await fetch('https://hasteb.in/post', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: evaded,
        })

        const json = (await response.json()) as { key: string }
        evaded = `https://hasteb.in/${json.key}`
        return await ctx.sendMessage({
          content: evaded,
        })
      } else {
        const msg = await ctx.sendMessage({
          content: `\`\`\`js\n${evaded}\n\`\`\``,
          components: [row],
        })
        const filter = (i: { customId: string; user: { id: string } }): boolean =>
          i.customId === 'eval-delete' && i.user.id === ctx.author!.id
        // @ts-ignore
        const collector = msg.createMessageComponentCollector({
          time: 60000,
          filter: filter,
        })
        collector.on('collect', async (i: { deferUpdate: () => any }) => {
          await i.deferUpdate()
          // @ts-ignore
          await msg.delete()
        })
      }
    } catch (e) {
      ctx.sendMessage(`\`\`\`js\n${e}\n\`\`\``)
    }
  }
}

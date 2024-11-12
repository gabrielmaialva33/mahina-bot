import { exec } from 'node:child_process'

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

import Command from '#common/command'
import type MahinaBot from '#common/mahina_bot'
import type Context from '#common/context'

export default class Restart extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'restart',
      description: {
        content: 'Restart the bot',
        examples: ['restart'],
        usage: 'restart',
      },
      category: 'dev',
      aliases: ['reboot'],
      cooldown: 3,
      args: false,
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

  async run(client: MahinaBot, ctx: Context): Promise<void> {
    const embed = this.client.embed()
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setLabel('Confirm Restart')
      .setCustomId('confirm-restart')
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button)
    const restartEmbed = embed
      .setColor(this.client.color.red)
      .setDescription(`**Are you sure you want to restart **\`${client.user?.username}\`?`)
      .setTimestamp()

    const msg = await ctx.sendMessage({
      embeds: [restartEmbed],
      components: [row],
    })

    const filter = (i: any) => i.customId === 'confirm-restart' && i.user.id === ctx.author?.id
    const collector = msg.createMessageComponentCollector({
      time: 30000,
      filter,
    })

    collector.on('collect', async (i) => {
      await i.deferUpdate()

      await msg.edit({
        content: 'Restarting the bot...',
        embeds: [],
        components: [],
      })

      await client.destroy()
      exec('node scripts/restart.js')
      process.exit(0)
    })

    collector.on('end', async () => {
      if (collector.collected.size === 0) {
        await msg.edit({
          content: 'Restart cancelled.',
          components: [],
        })
      }
    })
  }
}

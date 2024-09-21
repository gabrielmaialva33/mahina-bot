import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  type Message,
} from 'discord.js'

import { type BaseClient, Command, Context } from '#common/index'

export default class Deploy extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'deploy',
      description: {
        content: 'Deploy commands',
        examples: ['deploy'],
        usage: 'deploy',
      },
      category: 'dev',
      aliases: ['deploy-commands'],
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
        client: ['SendMessages', 'ReadMessageHistory', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: false,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context, _args: string[]): Promise<any> {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('deploy-global')
        .setLabel('Global')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('deploy-guild')
        .setLabel('Guild')
        .setStyle(ButtonStyle.Secondary)
    )

    let msg: Message | undefined
    try {
      msg = await ctx.sendMessage({
        content: 'Where do you want to deploy the commands?',
        components: [row],
      })
    } catch (error) {
      console.error('Failed to send the initial message:', error)
      return
    }

    const filter = (interaction: ButtonInteraction<'cached'>) => {
      if (interaction.user.id !== ctx.author!.id) {
        interaction
          .reply({
            content: "You can't interact with this message",
            ephemeral: true,
          })
          .catch(console.error)
        return false
      }
      return true
    }

    const collector = ctx.channel!.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 30000,
    })

    collector.on('collect', async (interaction) => {
      try {
        if (interaction.customId === 'deploy-global') {
          await client.deployCommands()
          await ctx.editMessage({
            content: 'Commands deployed globally.',
            components: [],
          })
        } else if (interaction.customId === 'deploy-guild') {
          await client.deployCommands(interaction.guild!.id)
          await ctx.editMessage({
            content: 'Commands deployed in this guild.',
            components: [],
          })
        }
      } catch (error) {
        console.error('Failed to handle interaction:', error)
      }
    })

    collector.on('end', async (_collected, reason) => {
      if (reason === 'time' && msg) {
        try {
          await msg.delete()
        } catch (error) {
          console.error('Failed to delete the message:', error)
        }
      }
    })
  }
}

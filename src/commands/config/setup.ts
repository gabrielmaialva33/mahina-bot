import {
  ApplicationCommandOptionType,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
} from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'
import { getButtons } from '#utils/buttons'

export default class Setup extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'setup',
      description: {
        content: 'Configura o bot para o servidor',
        examples: ['setup create', 'setup delete', 'setup info'],
        usage: 'setup',
      },
      category: 'config',
      aliases: ['setup'],
      cooldown: 3,
      args: true,
      player: {
        voice: false,
        dj: false,
        active: false,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks', 'ManageChannels'],
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [
        {
          name: 'create',
          description: 'Cria o canal de solicitação de música',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'delete',
          description: 'Deleta o canal de solicitação de música',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'info',
          description: 'Mostra informações sobre o canal de solicitação de música',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.guild) return

    let subCommand: string
    if (ctx.isInteraction) subCommand = ctx.interaction!.options.data[0].name
    else subCommand = args[0]

    const embed = client.embed().setColor(client.color.main)
    switch (subCommand) {
      case 'create': {
        const data = await client.db.getSetup(ctx.guild.id)

        if (data && data.textId && data.messageId)
          return await ctx.sendMessage({
            embeds: [
              {
                description: '𝙊 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙙𝙚 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙟𝙖́ 𝙚𝙭𝙞𝙨𝙩𝙚.',
                color: client.color.red,
              },
            ],
          })
        const textChannel = await ctx.guild.channels.create({
          name: `${this.client.user!.username}`,
          type: ChannelType.GuildText,
          topic: '𝙎𝙚𝙪 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙙𝙚 𝙢𝙪́𝙨𝙞𝙘𝙖',
          permissionOverwrites: [
            {
              type: OverwriteType.Member,
              id: this.client.user!.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
            {
              type: OverwriteType.Role,
              id: ctx.guild!.roles.everyone.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        })
        const player = this.client.queue.get(ctx.guild.id)
        const image = this.client.links.img
        const desc =
          player && player.queue && player.current
            ? `[${player.current.info.title}](${player.current.info.uri})`
            : '𝙉𝙖𝙙𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙖'

        embed.setDescription(desc).setImage(image)
        await textChannel.send({ embeds: [embed], components: getButtons() }).then(async (msg) => {
          await client.db.setSetup(ctx.guild!.id, textChannel.id, msg.id)
        })
        const embed2 = client.embed().setColor(client.color.main)
        await ctx.sendMessage({
          embeds: [
            embed2.setDescription(
              `𝙐𝙢 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙙𝙚 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙛𝙤𝙞 𝙘𝙧𝙞𝙖𝙙𝙤 𝙚𝙢 <#${textChannel.id}>`
            ),
          ],
        })
        break
      }
      case 'delete': {
        const data2 = await client.db.getSetup(ctx.guild.id)
        if (!data2)
          return await ctx.sendMessage({
            embeds: [
              {
                description: '𝙊 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙣𝙖̃𝙤 𝙚𝙭𝙞𝙨𝙩𝙚',
                color: client.color.red,
              },
            ],
          })
        await client.db.deleteSetup(ctx.guild.id)
        await ctx
          .guild!.channels.cache.get(data2.textId)!
          .delete()
          .catch(() => {
            client.logger.error('not possible to delete the channel')
          })
        await ctx.sendMessage({
          embeds: [
            {
              description: '𝙊 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙛𝙤𝙞 𝙙𝙚𝙨𝙩𝙧𝙪𝙞́𝙙𝙤',
              color: client.color.main,
            },
          ],
        })
        break
      }
      case 'info': {
        const data3 = await client.db.getSetup(ctx.guild.id)
        if (!data3)
          return await ctx.sendMessage({
            embeds: [
              {
                description: '𝙊 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙣𝙖̃𝙤 𝙚𝙭𝙞𝙨𝙩𝙚',
                color: client.color.red,
              },
            ],
          })
        const channel = ctx.guild.channels.cache.get(data3.textId)!
        embed
          .setDescription(`𝙊 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙨𝙤𝙡𝙞𝙘𝙞𝙩𝙖𝙘̧𝙖̃𝙤 𝙙𝙚 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙚́ <#${channel.id}>`)
          .setColor(client.color.main)
        await ctx.sendMessage({
          embeds: [embed],
        })
        break
      }
      default:
        break
    }
  }
}

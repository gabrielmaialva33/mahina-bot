import { ApplicationCommandOptionType } from 'discord.js'

import { BaseClient, Command, Context } from '#common/index'

export default class Dj extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'dj',
      description: {
        content: 'Gerencie o modo DJ e funções associadas',
        examples: ['dj add @role', 'dj remove @role', 'dj clear', 'dj toggle'],
        usage: 'dj',
      },
      category: 'general',
      aliases: ['dj'],
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
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: ['ManageGuild'],
      },
      slashCommand: true,
      options: [
        {
          name: 'add',
          description: 'O dj role que você deseja adicionar',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'role',
              description: 'O dj role que você deseja adicionar',
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: 'remove',
          description: 'O dj role que você deseja remover',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'role',
              description: 'O dj role que você deseja remover',
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: 'clear',
          description: 'Remove todos os dj roles',
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: 'toggle',
          description: 'Ativa ou desativa o modo dj',
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    })
  }

  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    let subCommand: string
    let role: any
    if (ctx.isInteraction) {
      subCommand = ctx.interaction!.options.data[0].name
      if (subCommand === 'add' || subCommand === 'remove') {
        // @ts-ignore
        role = ctx.interaction!.options.data[0].options[0].role
      }
    } else {
      subCommand = args[0]
      role = ctx.message!.mentions.roles.first() || ctx.guild!.roles.cache.get(args[1])
    }
    const embed = client.embed().setColor(client.color.main)
    let dj = client.db.getDj(ctx.guild!.id)
    if (subCommand === 'add') {
      if (!role)
        return await ctx.sendMessage({
          embeds: [embed.setDescription('𝙁𝙤𝙧𝙣𝙚𝙘̧𝙖 𝙪𝙢 𝙘𝙖𝙧𝙜𝙤 𝙥𝙖𝙧𝙖 𝙖𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙧')],
        })
      // eslint-disable-next-line unicorn/no-await-expression-member
      const isExRole = (await client.db.getRoles(ctx.guild!.id)).find((r) => r.roleId === role.id)
      if (isExRole)
        return await ctx.sendMessage({
          embeds: [embed.setDescription(`𝙊 𝙙𝙟 𝙧𝙤𝙡𝙚 <@&${role.id}> 𝙟𝙖́ 𝙛𝙤𝙞 𝙖𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙤`)],
        })
      await client.db.addRole(ctx.guild!.id, role.id)
      await client.db.setDj(ctx.guild!.id, true)
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`𝙊 𝙙𝙟 𝙧𝙤𝙡𝙚 <@&${role.id}> 𝙟𝙖́ 𝙛𝙤𝙞 𝙖𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙤`)],
      })
    } else if (subCommand === 'remove') {
      if (!role)
        return await ctx.sendMessage({
          embeds: [embed.setDescription('𝙁𝙤𝙧𝙣𝙚𝙘̧𝙖 𝙪𝙢𝙖 𝙛𝙪𝙣𝙘̧𝙖̃𝙤 𝙥𝙖𝙧𝙖 𝙧𝙚𝙢𝙤𝙫𝙚𝙧')],
        })
      // eslint-disable-next-line unicorn/no-await-expression-member
      const isExRole = (await client.db.getRoles(ctx.guild!.id)).find((r) => r.roleId === role.id)
      if (!isExRole)
        return await ctx.sendMessage({
          embeds: [embed.setDescription(`𝙊 𝙙𝙟 𝙧𝙤𝙡𝙚 <@&${role.id}> 𝙣𝙖̃𝙤 𝙚́ 𝙖𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙤`)],
        })
      await client.db.removeRole(ctx.guild!.id, role.id)
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`𝙊 𝙙𝙟 𝙧𝙤𝙡𝙚 <@&${role.id}> 𝙛𝙤𝙞 𝙧𝙚𝙢𝙤𝙫𝙞𝙙𝙤`)],
      })
    } else if (subCommand === 'clear') {
      if (!dj)
        return await ctx.sendMessage({
          embeds: [embed.setDescription('𝙉𝙖̃𝙤 𝙝𝙖́ 𝙛𝙪𝙣𝙘̧𝙤̃𝙚𝙨 𝙙𝙚 𝙙𝙟 𝙥𝙖𝙧𝙖 𝙡𝙞𝙢𝙥𝙖𝙧')],
        })
      await client.db.clearRoles(ctx.guild!.id)
      return await ctx.sendMessage({
        embeds: [embed.setDescription(`𝙊𝙨 𝙙𝙟 𝙧𝙤𝙡𝙚𝙨 𝙛𝙤𝙧𝙖𝙢 𝙧𝙚𝙢𝙤𝙫𝙞𝙙𝙤𝙨`)],
      })
    } else if (subCommand === 'toggle') {
      if (!dj)
        return await ctx.sendMessage({
          embeds: [embed.setDescription('𝙉𝙖̃𝙤 𝙝𝙖́ 𝙛𝙪𝙣𝙘̧𝙤̃𝙚𝙨 𝙙𝙚 𝘿𝙅 𝙥𝙖𝙧𝙖 𝙖𝙡𝙩𝙚𝙧𝙣𝙖𝙧')],
        })
      const data = await client.db.getDj(ctx.guild!.id)
      if (data) {
        await client.db.setDj(ctx.guild!.id, !data.mode)
        return await ctx.sendMessage({
          embeds: [
            embed.setDescription(
              `𝙊 𝙢𝙤𝙙𝙤 𝙙𝙟 𝙛𝙤𝙞 𝙖𝙡𝙩𝙚𝙧𝙣𝙖𝙙𝙤 𝙥𝙖𝙧𝙖 ${!data.mode ? '𝙖𝙩𝙞𝙫𝙖𝙙𝙤' : '𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤'}`
            ),
          ],
        })
      }
    } else {
      return await ctx.sendMessage({
        embeds: [
          embed.setDescription('𝙁𝙤𝙧𝙣𝙚𝙘̧𝙖 𝙪𝙢 𝙨𝙪𝙗𝙘𝙤𝙢𝙖𝙣𝙙𝙤 𝙫𝙖́𝙡𝙞𝙙𝙤').addFields({
            name: 'Subcommands',
            value: '`add`, `remove`, `clear`, `toggle`',
          }),
        ],
      })
    }
  }
}

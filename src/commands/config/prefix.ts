import { Command, Context, BaseClient } from '#common/index'

export default class Prefix extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'prefix',
      description: {
        content: 'Mostra ou altera o prefixo do bot no servidor',
        examples: ['prefix set', 'prefix reset', 'prefix set !'],
        usage: 'prefix set, prefix reset, prefix set !',
      },
      category: 'general',
      aliases: ['prefix'],
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
          name: 'set',
          description: 'Define o prefixo que você deseja',
          type: 1,
          options: [
            {
              name: 'prefix',
              description: 'O prefixo que você deseja',
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: 'reset',
          description: 'Resets the prefix to the default one',
          type: 1,
        },
      ],
    })
  }
  async run(client: BaseClient, ctx: Context, args: string[]): Promise<any> {
    const embed = client.embed().setColor(client.color.main)
    let prefix = await client.db.getPrefix(ctx.guild!.id)

    let subCommand: string
    let pre: string
    if (ctx.isInteraction) {
      subCommand = ctx.interaction!.options.data[0].name
      // @ts-ignore
      pre = ctx.interaction!.options.data[0].options[0]?.value.toString()
    } else {
      subCommand = args[0]
      pre = args[1]
    }
    switch (subCommand) {
      case 'set':
        if (!pre) {
          embed.setDescription(
            `𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙚́ \`${prefix ? prefix.prefix : client.env.DISC_BOT_PREFIX}\``
          )
          return await ctx.sendMessage({ embeds: [embed] })
        }
        if (pre.length > 3)
          return await ctx.sendMessage({
            embeds: [embed.setDescription(`𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙩𝙚𝙧 𝙢𝙖𝙞𝙨 𝙙𝙚 𝙩𝙧𝙚̂𝙨 𝙘𝙖𝙧𝙖𝙘𝙩𝙚𝙧𝙚𝙨.`)],
          })

        if (!prefix) {
          await client.db.setPrefix(ctx.guild!.id, pre)
          return await ctx.sendMessage({
            embeds: [embed.setDescription(`𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙖𝙜𝙤𝙧𝙖 𝙚́ \`${pre}\``)],
          })
        } else {
          await client.db.setPrefix(ctx.guild!.id, pre)
          return await ctx.sendMessage({
            embeds: [embed.setDescription(`𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙖𝙜𝙤𝙧𝙖 𝙚́ \`${pre}\``)],
          })
        }
      case 'reset':
        if (!prefix)
          return await ctx.sendMessage({
            embeds: [
              embed.setDescription(
                `𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙖𝙜𝙤𝙧𝙖 𝙚́ \`${client.env.DISC_BOT_PREFIX}\``
              ),
            ],
          })
        await client.db.setPrefix(ctx.guild!.id, client.env.DISC_BOT_PREFIX)
        return await ctx.sendMessage({
          embeds: [
            embed.setDescription(
              `𝙊 𝙥𝙧𝙚𝙛𝙞𝙭𝙤 𝙥𝙖𝙧𝙖 𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 𝙖𝙜𝙤𝙧𝙖 𝙚́ \`${client.env.DISC_BOT_PREFIX}\``
            ),
          ],
        })
    }
  }
}

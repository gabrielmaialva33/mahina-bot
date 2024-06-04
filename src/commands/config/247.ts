import { BaseClient, Command, Context } from '#common/index'
import { Player } from 'shoukaku'
import { GuildMember } from 'discord.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
export default class _247 extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: '247',
      description: {
        content: 'Mantém o bot 24/7 no canal de voz',
        examples: ['247'],
        usage: '247',
      },
      category: 'config',
      aliases: ['stay'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
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
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return
    if (!ctx.channel) return

    const embed = client.embed()
    let player = client.shoukaku.players.get(ctx.guild.id) as any

    try {
      const data = await client.db.get_247(ctx.guild.id)
      const member = ctx.member as GuildMember

      if (!member.voice.channel) {
        return await ctx.sendMessage({
          embeds: [
            embed
              .setDescription('𝙑𝙤𝙘𝙚 𝙥𝙧𝙚𝙘𝙞𝙨𝙖 𝙚𝙨𝙩𝙖𝙧 𝙣𝙤 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤.')
              .setColor(client.color.red),
          ],
        })
      }

      if (data) {
        await client.db.delete_247(ctx.guild.id)
        return await ctx.sendMessage({
          embeds: [
            embed.setDescription('**𝙊 𝙢𝙤𝙙𝙤 24/7 𝙛𝙤𝙞 𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙤**').setColor(client.color.red),
          ],
        })
      }
      await client.db.set_247(ctx.guild.id, ctx.channel.id, member.voice.channel.id)
      if (!player) {
        player = await client.queue.create(
          ctx.guild,
          member.voice.channel,
          ctx.channel,
          client.shoukaku.options.nodeResolver(client.shoukaku.nodes)
        )
      }
      return await ctx.sendMessage({
        embeds: [
          embed.setDescription('**𝙊 𝙢𝙤𝙙𝙤 24/7 𝙛𝙤𝙞 𝙚𝙣𝙖𝙗𝙡𝙚𝙘𝙞𝙙𝙤**').setColor(client.color.main),
        ],
      })
    } catch (error) {
      console.error('error in 24/7 command:', error)
      return await ctx.sendMessage({
        embeds: [
          embed
            .setDescription(
              '𝙊𝙘𝙤𝙧𝙧𝙚𝙪 𝙪𝙢 𝙚𝙧𝙧𝙤 𝙣𝙤 𝙘𝙤𝙢𝙖𝙣𝙙𝙤 𝙚𝙭𝙚𝙘𝙪𝙩𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤 𝙖𝙩𝙪𝙖𝙡𝙞𝙯𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤.'
            )
            .setColor(client.color.red),
        ],
      })
    }
  }
}

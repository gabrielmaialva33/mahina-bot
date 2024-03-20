import { Command, Context, Mahina } from '#common/index'

export default class GuildLeave extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'guildleave',
      description: {
        content: 'Sai do servidor',
        examples: ['guildleave'],
        usage: 'guildleave',
      },
      category: 'dev',
      aliases: ['gl'],
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

  async run(_client: Mahina, ctx: Context, args: string[]): Promise<any> {
    const guild = this.client.guilds.cache.get(args[0])
    if (!guild) return await ctx.sendMessage('𝙉𝙖𝙤 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙚𝙞 𝙤 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧')
    try {
      await guild.leave()
      ctx.sendMessage(`𝘿𝙚𝙞𝙭𝙚𝙞 𝙤 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 ${guild.name}`)
    } catch (e) {
      ctx.sendMessage(`𝙉𝙖𝙤 𝙛𝙤𝙞 𝙥𝙤𝙨𝙨𝙤 𝙨𝙖𝙞𝙧 𝙙𝙤 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧 ${guild.name}`)
    }
  }
}

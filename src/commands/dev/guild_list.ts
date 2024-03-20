import { Command, Context, Mahina } from '#common/index'

export default class GuildList extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'guildlist',
      description: {
        content: 'Mostra a lista de servidores que o bot está',
        examples: ['guildlist'],
        usage: 'guildlist',
      },
      category: 'dev',
      aliases: ['glt'],
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

  async run(client: Mahina, ctx: Context): Promise<any> {
    const guilds = this.client.guilds.cache.map((g) => `${g.name} (${g.id})`)

    let chunks = client.utils.chunk(guilds, 10) as any
    if (chunks.length === 0) chunks = 1
    const pages = []
    for (let i = 0; i < chunks.length; i++) {
      const embed = this.client
        .embed()
        .setColor(this.client.color.main)
        .setDescription(chunks[i].join('\n'))
        .setFooter({ text: `𝙋𝙖𝙜𝙞𝙣𝙖 ${i + 1} 𝙙𝙚 ${chunks.length}` })
      pages.push(embed)
    }
    return await client.utils.paginate(ctx, pages)
  }
}

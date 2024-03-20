import { Command, Context, BaseClient } from '#common/index'

export default class Queue extends Command {
  constructor(client: BaseClient) {
    super(client, {
      name: 'queue',
      description: {
        content: 'Mostra a fila de músicas.',
        examples: ['queue'],
        usage: 'queue',
      },
      category: 'music',
      aliases: ['q'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: false,
        active: true,
        dj_perm: null,
      },
      permissions: {
        dev: false,
        client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
        user: [],
      },
      slashCommand: true,
      options: [],
    })
  }

  async run(client: BaseClient, ctx: Context): Promise<any> {
    if (!ctx.guild) return

    const player = client.queue.get(ctx.guild.id)
    if (!player.current) return await ctx.sendMessage('𝙈𝙖𝙣𝙖̃.. 🥺 𝙢𝙖𝙨 𝙣𝙚𝙢 𝙩𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙚 𝙢𝙪𝙨𝙞𝙦𝙪𝙚..')
    if (player.queue.length === 0)
      return await ctx.sendMessage({
        embeds: [
          this.client
            .embed()
            .setColor(this.client.color.main)
            .setDescription(
              `📀 𝙉𝙤𝙬 𝙥𝙡𝙖𝙮𝙞𝙣𝙜: [${player.current.info.title}](${
                player.current.info.uri
              }) - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚: ${player.current?.info.requestedBy} - 𝘿𝙪𝙧𝙖𝙘̧𝙖̃𝙤: ${
                player.current.info.isStream
                  ? '🔴 𝙇𝙄𝙑𝙀'
                  : this.client.utils.formatTime(player.current.info.length)
              }`
            ),
        ],
      })
    const queue = player.queue.map(
      (track, index) =>
        `${index + 1}. [${track.info.title}](${track.info.uri}) - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚: ${
          track?.info.requestedBy
        } - 𝘿𝙪𝙧𝙖𝙘̧𝙖̃𝙤: ${
          track.info.isStream ? '🔴 𝙇𝙄𝙑𝙀' : this.client.utils.formatTime(track.info.length)
        }`
    )
    let chunks = client.utils.chunk(queue, 10) as any
    if (chunks.length === 0) chunks = 1
    const pages = []
    for (let i = 0; i < chunks.length; i++) {
      const embed = this.client
        .embed()
        .setColor(this.client.color.main)
        .setAuthor({ name: '🚦 𝙁𝙞𝙡𝙖', iconURL: ctx.guild.iconURL({})! })
        .setDescription(chunks[i].join('\n'))
        .setFooter({ text: `𝙋𝙖𝙜𝙚 ${i + 1} 𝙙𝙚 ${chunks.length}` })
      pages.push(embed)
    }

    return await client.utils.paginate(ctx, pages)
  }
}

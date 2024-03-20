import { Command, Context, Mahina } from '#common/index'

export default class Leave extends Command {
  constructor(client: Mahina) {
    super(client, {
      name: 'leave',
      description: {
        content: 'Sai do canal de voz',
        examples: ['leave'],
        usage: 'leave',
      },
      category: 'music',
      aliases: ['dc'],
      cooldown: 3,
      args: false,
      player: {
        voice: true,
        dj: true,
        active: false,
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

  async run(client: Mahina, ctx: Context): Promise<any> {
    const player = client.queue.get(ctx.guild!.id)
    const embed = this.client.embed()
    if (player) {
      ctx.sendMessage({
        embeds: [
          embed
            .setColor(this.client.color.main)
            .setDescription(
              `𝙎𝙖𝙞𝙣𝙙𝙤 <#${player.node.manager.connections.get(ctx.guild!.id)!.channelId}>`
            ),
        ],
      })
      player.destroy()
    } else {
      ctx.sendMessage({
        embeds: [
          embed.setColor(this.client.color.red).setDescription(`𝙉𝙖̃𝙤 𝙚𝙨𝙩𝙤𝙪 𝙣𝙤 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙫𝙤𝙯!`),
        ],
      })
    }
  }
}

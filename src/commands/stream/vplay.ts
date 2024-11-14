import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import fs from 'node:fs'
import path from 'node:path'

export default class VPlay extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'vplay',
      description: {
        content: 'Stream de vídeo no canal de voz.',
        examples: [
          'vplay https://www.youtube.com/watch?v=A7blkCcowvk',
          'vplay https://www.twitch.tv/monstercat',
        ],
        usage: 'vplay <url>',
      },
      category: 'stream',
      aliases: ['vp'],
      cooldown: 3,
      args: true,
      vote: false,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          'SendMessages',
          'ReadMessageHistory',
          'ViewChannel',
          'EmbedLinks',
          'Connect',
          'Speak',
        ],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: 'song',
          description: 'cmd.play.options.song',
          type: 3,
          required: false,
          autocomplete: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<any> {
    if (!ctx.guild) return
    if (!ctx.member) return

    const downloadsPath = fs.readdirSync(path.join(process.cwd(), 'downloads'))

    let files = downloadsPath.map((file) => {
      if (file.endsWith('.mp4') || file.endsWith('.mkv')) {
        const fileName = path.parse(file).name
        return {
          name: fileName,
          path: path.join(path.join(process.cwd(), 'downloads'), file),
        }
      }
    })

    files = files.filter((file) => file !== undefined)
    // get Space Song.mp4
    const file = files.find((f) => f!.name === 'Space Song')

    console.log(file)

    await this.client.selfbot.play(ctx.guild.id, ctx.member, file!.path, file?.name)
  }
}

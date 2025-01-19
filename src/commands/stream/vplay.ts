import fs from 'node:fs'
import path from 'node:path'

import { create } from 'youtube-dl-exec'
import ytdl from '@distube/ytdl-core'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { T } from '#common/i18n'

import { env } from '#src/env'
import { ApplicationCommandOptionType } from 'discord.js'

const youtubedl = create(env.YTDL_BIN_PATH)

export default class VPlay extends Command {
  constructor(client: MahinaBot) {
    super(client, {
      name: 'vplay',
      description: {
        content: 'cmd.vplay.description',
        examples: [
          'vplay https://www.youtube.com/watch?v=A7blkCcowvk',
          'vplay https://www.youtube.com/watch?v=mMqSqbyCl30',
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
          name: 'url',
          description: 'cmd.vplay.options.url',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    })
  }

  async run(client: MahinaBot, ctx: Context, args: string[]): Promise<void> {
    if (!ctx.guild || !ctx.member || !ctx.author) return

    const query = args.join(' ').trim()
    if (!ytdl.validateURL(query)) {
      await ctx.sendMessage(ctx.locale('cmd.vplay.errors.invalid_url'))
    }

    await ctx.sendMessage(ctx.locale('cmd.vplay.loading'))

    try {
      await ctx.editMessage(ctx.locale('cmd.vplay.info_fetching'))
      const videoInfo = await youtubedl(query, { dumpJson: true })
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { title, webpage_url, thumbnail, channel, duration } = videoInfo

      // escape the title to avoid any issues with the file name
      const safeTitle = this.sanitizeFilename(title)

      const outputPath = path.join(process.cwd(), 'downloads', `${safeTitle}.%(ext)s`)

      console.log(`Downloading to ${outputPath}`)

      await ctx.editMessage(ctx.locale('cmd.vplay.downloading'))
      await youtubedl(query, { output: outputPath })

      const downloadsPath = path.join(process.cwd(), 'downloads')
      const files = fs.readdirSync(downloadsPath)

      const matchedFile = files.find((file) => path.parse(file).name === safeTitle)
      if (!matchedFile) await ctx.editMessage(ctx.locale('cmd.vplay.errors.download_failed'))

      const filePath = path.join(downloadsPath, matchedFile!)

      const locale = await client.db.getLanguage(ctx.guild.id)
      const embed = client
        .embed()
        .setAuthor({
          name: T(locale, 'player.trackStart.now_playing'),
          iconURL: client.config.icons['youtube'],
        })
        .setColor(client.color.main)
        .setDescription(`**[${title}](${webpage_url})**`)
        .setFooter({
          text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
          iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
        })
        .setThumbnail(thumbnail)
        .addFields(
          {
            name: T(locale, 'player.trackStart.duration'),
            value: client.utils.formatTime(duration),
            inline: true,
          },
          {
            name: T(locale, 'player.trackStart.author'),
            value: channel,
            inline: true,
          }
        )
        .setTimestamp()

      await ctx.editMessage({ content: '', embeds: [embed] })

      await client.selfbot.play(ctx.guild.id, ctx.member, filePath, title).finally(async () => {
        fs.unlinkSync(filePath)
        await ctx.editMessage(ctx.locale('cmd.vplay.cleanup'))
      })
    } catch (error) {
      this.client.logger.error(error)
      await ctx.sendMessage(ctx.locale('cmd.vplay.errors.general_error'))
    }
  }

  sanitizeFilename(title: string) {
    return title
      .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_')
      .slice(0, 255)
      .replace(/\s+/g, '_')
  }
}

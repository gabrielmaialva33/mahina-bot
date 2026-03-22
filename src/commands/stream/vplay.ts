import path from 'node:path'

import { create } from 'youtube-dl-exec'
import ytdl from '@distube/ytdl-core'

import Command from '#common/command'
import MahinaBot from '#common/mahina_bot'
import Context from '#common/context'
import { ensureStreamCommandReady } from '#common/stream_runtime'
import { T } from '#common/i18n'
import type { StreamTrack } from '#common/stream_queue'
import type { DownloadProgress } from '#common/download_manager'

import { env } from '#src/env'
import { ApplicationCommandOptionType } from 'discord.js'

const youtubedl = env.YTDL_BIN_PATH ? create(env.YTDL_BIN_PATH) : create('yt-dlp')

const PROGRESS_EDIT_INTERVAL = 5_000
const BAR_LENGTH = 14

function progressBar(percent: number): string {
  const filled = Math.round((percent / 100) * BAR_LENGTH)
  const empty = BAR_LENGTH - filled
  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`
}

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
    if (!(await ensureStreamCommandReady(client, ctx))) return

    const query = args.join(' ').trim()
    if (!ytdl.validateURL(query)) {
      return await ctx.sendMessage(ctx.locale('cmd.vplay.errors.invalid_url'))
    }

    await ctx.sendMessage(ctx.locale('cmd.vplay.info_fetching'))

    try {
      const ytdlpFlags: Record<string, unknown> = {
        jsRuntimes: 'node',
        remoteComponents: 'ejs:github',
        extractorArgs: 'youtube:player_client=ios,tv',
        noCheckCertificates: true,
        cacheDir: path.join(process.cwd(), '.cache', 'yt-dlp'),
      }

      if (env.YOUTUBE_COOKIES_PATH) {
        ytdlpFlags.cookies = env.YOUTUBE_COOKIES_PATH
      }

      // Step 1: Fetch video info (~3s)
      const videoInfo = await youtubedl(query, { dumpJson: true, ...ytdlpFlags })
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { title, webpage_url, thumbnail, channel, duration } = videoInfo

      const safeTitle = this.sanitizeFilename(title)
      const outputPath = path.join(process.cwd(), 'downloads', `${safeTitle}.%(ext)s`)
      const locale = await client.db.getLanguage(ctx.guild.id)

      // Step 2: Create track with 'downloading' status and enqueue immediately
      const track: StreamTrack = {
        type: 'youtube',
        source: query,
        title,
        thumbnail,
        duration: duration ? duration * 1000 : undefined,
        author: channel,
        url: webpage_url,
        requester: { id: ctx.author.id, username: ctx.author.username },
        deleteAfterPlay: true,
        status: 'downloading',
      }

      const position = await client.selfbot.enqueue(
        ctx.guild.id,
        ctx.member,
        track,
        ctx.channel!.id
      )

      // Step 3: Show queued/playing embed immediately
      if (position === 0) {
        const embed = client
          .embed()
          .setAuthor({
            name: T(locale, 'player.trackStart.now_playing'),
            iconURL: client.config.icons['youtube'],
          })
          .setColor(client.color.main)
          .setDescription(`[${title}](${webpage_url})\n⏳ Download em progresso...`)
          .setFooter({
            text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
            iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
          })
          .setThumbnail(thumbnail)
          .addFields(
            {
              name: T(locale, 'player.trackStart.duration'),
              value: client.utils.formatTime(duration * 1000),
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
      } else {
        const embed = client
          .embed()
          .setColor(client.color.main)
          .setDescription(
            T(locale, 'cmd.vplay.added_to_queue', {
              title,
              uri: webpage_url,
              position: String(position),
            }) + '\n⏳ Download em progresso...'
          )
          .setFooter({
            text: T(locale, 'player.trackStart.requested_by', { user: ctx.author.username }),
            iconURL: ctx.author.avatarURL() || ctx.author.defaultAvatarURL,
          })
          .setTimestamp()

        await ctx.editMessage({ content: '', embeds: [embed] })
      }

      // Step 4: Start background download
      const downloadId = client.downloadManager.start(track, query, outputPath)

      // Step 5: Progress updates (throttled)
      let lastEdit = 0
      const onProgress = (_id: string, progress: DownloadProgress) => {
        if (_id !== downloadId) return
        const now = Date.now()
        if (now - lastEdit < PROGRESS_EDIT_INTERVAL) return
        lastEdit = now

        const bar = `\`${progressBar(progress.percent)}\` ${progress.percent.toFixed(1)}% · ${progress.speed} · ETA ${progress.eta}`
        const desc =
          position === 0
            ? `[${title}](${webpage_url})\n${bar}`
            : `${T(locale, 'cmd.vplay.added_to_queue', { title, uri: webpage_url, position: String(position) })}\n${bar}`

        const embed = client.embed().setColor(client.color.main).setDescription(desc).setTimestamp()

        ctx.editMessage({ content: '', embeds: [embed] }).catch(() => {})
      }

      const onComplete = (_id: string) => {
        if (_id !== downloadId) return
        cleanup()

        const desc =
          position === 0
            ? `[${title}](${webpage_url})\n✅ Download completo!`
            : `${T(locale, 'cmd.vplay.added_to_queue', { title, uri: webpage_url, position: String(position) })}\n✅ Download completo!`

        const embed = client
          .embed()
          .setColor(client.color.green)
          .setDescription(desc)
          .setTimestamp()

        ctx.editMessage({ content: '', embeds: [embed] }).catch(() => {})
      }

      const onError = (_id: string, error: Error) => {
        if (_id !== downloadId) return
        cleanup()

        if (error.message === 'Cancelled') return

        const embed = client
          .embed()
          .setColor(client.color.red)
          .setDescription(`❌ Download falhou: **${title}**\n${error.message}`)
          .setTimestamp()

        ctx.editMessage({ content: '', embeds: [embed] }).catch(() => {})
      }

      const cleanup = () => {
        client.downloadManager.off('progress', onProgress)
        client.downloadManager.off('complete', onComplete)
        client.downloadManager.off('error', onError)
      }

      client.downloadManager.on('progress', onProgress)
      client.downloadManager.on('complete', onComplete)
      client.downloadManager.on('error', onError)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.client.logger.error(`vplay failed for ${query}: ${message}`, error)
      await ctx.editMessage(ctx.locale('cmd.vplay.errors.general_error'))
    }
  }

  sanitizeFilename(title: string) {
    return (
      title
        .replace(/[<>:"\/\\|?*]/g, '_')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F]/g, '_')
        .slice(0, 255)
        .replace(/\s+/g, '_')
    )
  }
}

import {
  type ColorResolvable,
  EmbedBuilder,
  type Guild,
  type Message,
  type TextChannel,
} from 'discord.js'

import type { Player, Track } from 'lavalink-client'

import type MahinaBot from '#common/mahina_bot'
import { T } from '#common/i18n'

import { Requester } from '#src/types'
import { getButtons } from '#utils/buttons'

function getLoopLabel(player: Player, locale: string): string {
  switch (player.repeatMode) {
    case 'track':
      return T(locale, 'player.trackPanel.loop.track')
    case 'queue':
      return T(locale, 'player.trackPanel.loop.queue')
    default:
      return T(locale, 'player.trackPanel.loop.off')
  }
}

function getAutoplayLabel(player: Player, locale: string): string {
  return player.get<boolean>('autoplay')
    ? T(locale, 'player.trackPanel.autoplay.on')
    : T(locale, 'player.trackPanel.autoplay.off')
}

function getProgressLabel(player: Player, client: MahinaBot, locale: string): string {
  const current = player.queue.current

  if (!current) {
    return T(locale, 'player.trackPanel.queue.empty')
  }

  if (current.info.isStream) {
    return T(locale, 'player.trackPanel.live')
  }

  const duration = current.info.duration
  const position = Math.min(player.position, duration)
  const bar = client.utils.progressBar(position, duration, 16)

  return `${bar}\n\`${client.utils.formatTime(position)} / ${client.utils.formatTime(duration)}\``
}

function getQueuePreview(player: Player, locale: string): string {
  if (player.queue.tracks.length === 0) {
    return T(locale, 'player.trackPanel.queue.empty')
  }

  return player.queue.tracks
    .slice(0, 3)
    .map((track, index) =>
      T(locale, 'player.trackPanel.queue.item', {
        index: index + 1,
        title: track.info.title,
      })
    )
    .join('\n')
}

function getControlSummary(player: Player, client: MahinaBot, locale: string): string {
  return [
    T(locale, 'player.trackPanel.controls.loop', {
      value: getLoopLabel(player, locale),
    }),
    T(locale, 'player.trackPanel.controls.autoplay', {
      value: getAutoplayLabel(player, locale),
    }),
    T(locale, 'player.trackPanel.controls.volume', {
      value: `${player.volume}%`,
    }),
    T(locale, 'player.trackPanel.controls.queue_size', {
      value: String(player.queue.tracks.length),
    }),
  ].join('\n')
}

export function createNowPlayingEmbed(
  client: MahinaBot,
  player: Player,
  locale: string,
  track?: Track
): EmbedBuilder {
  const currentTrack = track || player.queue.current
  const embed = client.embed().setColor(client.color.main)

  if (!currentTrack) {
    return embed.setDescription(T(locale, 'player.setupStart.nothing_playing'))
  }

  const requester = (currentTrack.requester || player.queue.current?.requester) as
    | Requester
    | undefined
  const iconUrl =
    client.config.icons[currentTrack.info.sourceName] ||
    client.user?.displayAvatarURL({ extension: 'png' })
  const artwork = currentTrack.info.artworkUrl || client.config.links.img

  return embed
    .setAuthor({
      name: T(locale, 'player.trackStart.now_playing'),
      iconURL: iconUrl,
    })
    .setDescription(`[${currentTrack.info.title}](${currentTrack.info.uri})`)
    .setThumbnail(artwork)
    .addFields(
      {
        name: T(locale, 'player.trackPanel.fields.progress'),
        value: getProgressLabel(player, client, locale),
        inline: false,
      },
      {
        name: T(locale, 'player.trackPanel.fields.author'),
        value: currentTrack.info.author,
        inline: true,
      },
      {
        name: T(locale, 'player.trackPanel.fields.requester'),
        value: requester ? `<@${requester.id}>` : T(locale, 'player.trackPanel.requester.unknown'),
        inline: true,
      },
      {
        name: T(locale, 'player.trackPanel.fields.controls'),
        value: getControlSummary(player, client, locale),
        inline: true,
      },
      {
        name: T(locale, 'player.trackPanel.fields.up_next'),
        value: getQueuePreview(player, locale),
        inline: false,
      }
    )
    .setFooter({
      text: T(locale, 'player.trackStart.requested_by', {
        user: requester?.username || T(locale, 'player.trackPanel.requester.unknown_label'),
      }),
      iconURL: requester?.avatarURL,
    })
    .setTimestamp()
}

/**
 * A function that will generate an embed based on the player's current track.
 * @param embed The embed that will be modified.
 * @param player The player to get the current track from.
 * @param client The client to get the config from.
 * @param locale The locale to translate the strings.
 * @returns The modified embed.
 */
function neb(embed: EmbedBuilder, player: Player, client: MahinaBot, locale: string): EmbedBuilder {
  if (!player?.queue.current?.info) return embed

  const panel = createNowPlayingEmbed(client, player, locale)
  return embed
    .setAuthor(panel.data.author || null)
    .setDescription(panel.data.description || null)
    .setThumbnail(panel.data.thumbnail?.url || null)
    .setFields(panel.data.fields || [])
    .setFooter(panel.data.footer || null)
    .setColor(client.color.main)
}

/**
 * A function that will generate a setup message or edit an existing one
 * with the current song playing.
 * @param client The client to get the config from.
 * @param query The query to search for.
 * @param player The player to get the current track from.
 * @param message The message to edit or send the setup message.
 * @returns A promise that resolves when the function is done.
 */
async function setupStart(
  client: MahinaBot,
  query: string,
  player: Player,
  message: Message
): Promise<void> {
  let m: Message | undefined
  const embed = client.embed()
  const n = client.embed().setColor(client.color.main)
  const data = await client.db.getSetup(message.guild!.id)
  const locale = await client.db.getLanguage(message.guildId!)
  try {
    if (data)
      m = await message.channel.messages.fetch({
        message: data.messageId,
        cache: true,
      })
  } catch (error) {
    client.logger.error(error)
  }
  if (m) {
    try {
      if (message.inGuild()) {
        const res = await player.search(query, message.author)

        switch (res.loadType) {
          case 'empty':
          case 'error':
            await message.channel
              .send({
                embeds: [
                  embed
                    .setColor(client.color.red)
                    .setDescription(T(locale, 'player.setupStart.error_searching')),
                ],
              })
              .then((msg) => setTimeout(() => msg.delete(), 5000))
            break
          case 'search':
          case 'track': {
            player.queue.add(res.tracks[0])
            await message.channel
              .send({
                embeds: [
                  embed.setColor(client.color.main).setDescription(
                    T(locale, 'player.setupStart.added_to_queue', {
                      title: res.tracks[0].info.title,
                      uri: res.tracks[0].info.uri,
                    })
                  ),
                ],
              })
              .then((msg) => setTimeout(() => msg.delete(), 5000))
            neb(n, player, client, locale)
            await m.edit({ embeds: [n] }).catch(() => {
              null
            })
            break
          }
          case 'playlist': {
            player.queue.add(res.tracks)
            await message.channel
              .send({
                embeds: [
                  embed.setColor(client.color.main).setDescription(
                    T(locale, 'player.setupStart.added_playlist_to_queue', {
                      length: res.tracks.length,
                    })
                  ),
                ],
              })
              .then((msg) => setTimeout(() => msg.delete(), 5000))
            neb(n, player, client, locale)
            await m.edit({ embeds: [n] }).catch(() => {
              null
            })
            break
          }
        }
        if (!player.playing && player.queue.tracks.length > 0) await player.play()
      }
    } catch (error) {
      client.logger.error(error)
    }
  }
}

/**
 * A function that will generate an embed based on the player's current track.
 * @param msgId The message ID of the setup message.
 * @param channel The channel to send the message in.
 * @param player The player to get the current track from.
 * @param track The track to generate the embed for.
 * @param client The client to get the config from.
 * @param locale The locale to translate the strings.
 * @returns A promise that resolves when the function is done.
 */
async function trackStart(
  msgId: string,
  channel: TextChannel,
  player: Player,
  track: Track,
  client: MahinaBot,
  locale: string
): Promise<void> {
  let m: Message | undefined

  try {
    m = await channel.messages.fetch({ message: msgId, cache: true })
  } catch (error) {
    client.logger.error(error)
  }
  const embed = createNowPlayingEmbed(client, player, locale, track)

  if (m) {
    await m
      .edit({
        embeds: [embed],
        components: getButtons(player, client).map((b) => {
          b.components.forEach((c) => c.setDisabled(!player?.queue.current))
          return b
        }),
      })
      .catch((error) => {
        client.logger.error('Failed to update setup player message:', error)
      })
  } else {
    await channel
      .send({
        embeds: [embed],
        components: getButtons(player, client).map((b) => {
          b.components.forEach((c) => c.setDisabled(!player?.queue.current))
          return b
        }),
      })
      .then((msg) => {
        client.db.setSetup(msg.guild.id, msg.channel.id, msg.id)
      })
      .catch((error) => {
        client.logger.error('Failed to create setup player message:', error)
      })
  }
}

async function updateSetup(client: MahinaBot, guild: Guild, locale: string): Promise<void> {
  const setup = await client.db.getSetup(guild.id)
  let m: Message | undefined
  if (setup?.textId) {
    const textChannel = guild.channels.cache.get(setup.textId) as TextChannel
    if (!textChannel) return
    try {
      m = await textChannel.messages.fetch({
        message: setup.messageId,
        cache: true,
      })
    } catch (error) {
      client.logger.error(error)
    }
  }
  if (m) {
    const player = client.manager.getPlayer(guild.id)
    if (player?.queue.current) {
      const embed = createNowPlayingEmbed(client, player, locale)
      await m
        .edit({
          embeds: [embed],
          components: getButtons(player, client).map((b) => {
            b.components.forEach((c) => c.setDisabled(!player?.queue.current))
            return b
          }),
        })
        .catch(() => {
          null
        })
    } else {
      const embed = client
        .embed()
        .setColor(client.color.main)
        .setAuthor({
          name: client.user!.username,
          iconURL: client.user!.displayAvatarURL({ extension: 'png' }),
        })
        .setDescription(T(locale, 'player.setupStart.nothing_playing'))
        .setImage(client.config.links.img)
      await m
        .edit({
          embeds: [embed],
          components: getButtons(player!, client).map((b) => {
            b.components.forEach((c) => c.setDisabled(true))
            return b
          }),
        })
        .catch(() => {
          null
        })
    }
  }
}

async function buttonReply(int: any, args: string, color: ColorResolvable): Promise<void> {
  const embed = new EmbedBuilder()
  let m: Message
  if (int.replied) {
    m = await int.editReply({ embeds: [embed.setColor(color).setDescription(args)] }).catch(() => {
      null
    })
  } else {
    m = await int.followUp({ embeds: [embed.setColor(color).setDescription(args)] }).catch(() => {
      null
    })
  }
  setTimeout(async () => {
    if (int && !int.ephemeral) {
      await m.delete().catch(() => {
        null
      })
    }
  }, 2000)
}

async function oops(channel: TextChannel, args: string): Promise<void> {
  try {
    const embed1 = new EmbedBuilder().setColor('Red').setDescription(`${args}`)
    const m = await channel.send({
      embeds: [embed1],
    })
    setTimeout(
      async () =>
        await m.delete().catch(() => {
          null
        }),
      12000
    )
  } catch (e) {
    return console.error(e)
  }
}

export { setupStart, trackStart, buttonReply, updateSetup, oops }

import { ColorResolvable, EmbedBuilder, Message, TextChannel } from 'discord.js'
import { LoadType } from 'shoukaku'

import { getButtons } from '#utils/buttons'
import { Dispatcher, BaseClient, Song } from '#common/index'
import { env } from '#src/env'

function neb(embed: EmbedBuilder, player: Dispatcher, client: BaseClient): EmbedBuilder {
  if (!player.current) return embed
  if (!client.user) return embed

  let iconUrl = client.icons[player.current.info.sourceName as keyof typeof client.icons]
  if (!iconUrl) iconUrl = client.user.displayAvatarURL({ extension: 'png' })

  let icon = player.current ? player.current.info.artworkUrl : client.links.img
  if (!icon) icon = client.links.img

  return embed
    .setAuthor({ name: '💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜', iconURL: iconUrl })
    .setDescription(
      `[${player.current.info.title}](${player.current.info.uri}) 𝙥𝙤𝙧 ${
        player.current.info.author
      } • \`[${client.utils.formatTime(player.current.info.length)}]\` - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚 ${
        player.current.info.requestedBy
      }`
    )
    .setImage(icon)
    .setColor(client.color.main)
}

async function setupStart(
  client: BaseClient,
  query: string,
  player: Dispatcher,
  message: Message
): Promise<void> {
  let m: Message
  const embed = client.embed()
  let n = client.embed().setColor(client.color.main)

  try {
    m = await message.channel.messages.fetch({ message: message.id, cache: true })
  } catch (error) {
    client.logger.error(error)
  }
  // @ts-ignore
  if (m) {
    try {
      let res = await client.queue.search(query)
      if (!res) return

      switch (res.loadType) {
        case LoadType.ERROR:
          await message.channel
            .send({
              embeds: [
                embed
                  .setColor(client.color.red)
                  .setDescription('🥺 𝙊𝙘𝙤𝙧𝙧𝙚𝙪 𝙪𝙢 𝙚𝙧𝙧𝙤 𝙙𝙪𝙧𝙖𝙣𝙩𝙚 𝙖 𝙥𝙚𝙨𝙦𝙪𝙞𝙨𝙖.'),
              ],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete()
              }, 5000)
            })
          break
        case LoadType.EMPTY:
          await message.channel
            .send({
              embeds: [embed.setColor(client.color.red).setDescription('😓 𝙈𝙖𝙣𝙖̃.. 𝙣𝙖̃𝙤 𝙖𝙘𝙝𝙚𝙞 𝙣𝙖𝙙𝙚')],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete()
              }, 5000)
            })
          break
        case LoadType.TRACK:
          const track = player.buildTrack(res.data, message.author)

          if (player.queue.length > client.env.MAX_QUEUE_SIZE) {
            await message.channel
              .send({
                embeds: [
                  embed
                    .setColor(client.color.red)
                    .setDescription(
                      `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                    ),
                ],
              })
              .then((msg) => {
                setTimeout(() => {
                  msg.delete()
                }, 5000)
              })
            return
          }
          player.queue.push(track)
          await player.isPlaying()
          await message.channel
            .send({
              embeds: [
                embed
                  .setColor(client.color.main)
                  .setDescription(
                    `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res.data.info.title}](${res.data.info.uri}) 𝙣𝙖 𝙛𝙞𝙡𝙖.`
                  ),
              ],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete()
              }, 5000)
            })
          neb(n, player, client)
          if (m) await m.edit({ embeds: [n] }).catch(() => {})
          break
        case LoadType.PLAYLIST:
          if (res.data.tracks.length > client.env.MAX_PLAYLIST_SIZE) {
            await message.channel
              .send({
                embeds: [
                  embed
                    .setColor(client.color.red)
                    .setDescription(
                      `💽 𝘼 𝙥𝙡𝙖𝙮𝙡𝙞𝙨𝙩 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́  ${client.env.MAX_PLAYLIST_SIZE}.`
                    ),
                ],
              })
              .then((msg) => {
                setTimeout(() => {
                  msg.delete()
                }, 5000)
              })
            return
          }

          // eslint-disable-next-line @typescript-eslint/no-shadow
          for (const track of res.data.tracks) {
            const pl = player.buildTrack(track, message.author)
            if (player.queue.length > client.env.MAX_QUEUE_SIZE) {
              await message.channel
                .send({
                  embeds: [
                    embed
                      .setColor(client.color.red)
                      .setDescription(
                        `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                      ),
                  ],
                })
                .then((msg) => {
                  setTimeout(() => {
                    msg.delete()
                  }, 5000)
                })
              return
            }
            player.queue.push(pl)
          }
          await player.isPlaying()
          await message.channel
            .send({
              embeds: [
                embed
                  .setColor(client.color.main)
                  .setDescription(
                    `💽 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res.data.tracks.length}](${res.data.tracks[0].info.uri}) 𝙣𝙖 𝙛𝙞𝙡𝙖.`
                  ),
              ],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete()
              }, 5000)
            })
          neb(n, player, client)
          if (m) await m.edit({ embeds: [n] }).catch(() => {})
          break
        case LoadType.SEARCH:
          const track2 = player.buildTrack(res.data[0], message.author)
          if (player.queue.length > client.env.MAX_QUEUE_SIZE) {
            await message.channel
              .send({
                embeds: [
                  embed
                    .setColor(client.color.red)
                    .setDescription(
                      `🚦 𝘼 𝙛𝙞𝙡𝙖 𝙚́ 𝙢𝙪𝙞𝙩𝙤 𝙡𝙤𝙣𝙜𝙖. 𝙊 𝙢𝙖́𝙭𝙞𝙢𝙤 𝙚́ ${client.env.MAX_QUEUE_SIZE}.`
                    ),
                ],
              })
              .then((msg) => {
                setTimeout(() => {
                  msg.delete()
                }, 5000)
              })
            return
          }
          player.queue.push(track2)
          await player.isPlaying()
          await message.channel
            .send({
              embeds: [
                embed
                  .setColor(client.color.main)
                  .setDescription(
                    `🔉 𝘼𝙙𝙞𝙘𝙞𝙤𝙣𝙖𝙙𝙖 [${res.data[0].info.title}](${res.data[0].info.uri}) 𝙣𝙖 𝙛𝙞𝙡𝙖.`
                  ),
              ],
            })
            .then((msg) => {
              setTimeout(() => {
                msg.delete()
              }, 5000)
            })
          neb(n, player, client)
          if (m) await m.edit({ embeds: [n] }).catch(() => {})
          break
      }
    } catch (error) {
      client.logger.error(error)
    }
  }
}

async function trackStart(
  msgId: any,
  channel: TextChannel,
  player: Dispatcher,
  track: Song,
  client: BaseClient
): Promise<void> {
  let icon = player.current ? player.current.info.artworkUrl : client.links.img
  let m: Message
  try {
    m = await channel.messages.fetch({ message: msgId, cache: true })
  } catch (error) {
    client.logger.error(error)
  }

  // @ts-ignore
  if (m) {
    if (!player.current) return

    let iconUrl = client.icons[player.current.info.sourceName as keyof typeof client.icons]
    if (!iconUrl) iconUrl = client.user!.displayAvatarURL({ extension: 'png' })
    const embed = client
      .embed()
      .setAuthor({ name: `💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜`, iconURL: iconUrl })
      .setColor(client.color.main)
      .setDescription(
        `[${track.info.title}](${track.info.uri}) - \`[${client.utils.formatTime(
          track.info.length
        )}]\` - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚 ${track.info.requestedBy}`
      )
      .setImage(icon!)
    await m
      .edit({
        embeds: [embed],
        components: getButtons().map((b) => {
          b.components.forEach((c) => {
            c.setDisabled(!(player && player.current))
          })
          return b
        }),
      })
      .catch(() => {})
  } else {
    if (!player.current) return

    let iconUrl = client.icons[player.current.info.sourceName as keyof typeof client.icons]
    if (!iconUrl) iconUrl = client.user!.displayAvatarURL({ extension: 'png' })
    const embed = client
      .embed()
      .setColor(client.color.main)
      .setAuthor({ name: `💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜`, iconURL: iconUrl })
      .setDescription(
        `[${track.info.title}](${track.info.uri}) - \`[${client.utils.formatTime(
          track.info.length
        )}]\` - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚 ${track.info.requestedBy}`
      )
      .setImage(icon!)
    await channel
      .send({
        embeds: [embed],
        components: getButtons().map((b) => {
          b.components.forEach((c) => {
            c.setDisabled(!(player && player.current))
          })
          return b
        }),
      })
      .then((msg) => {
        client.logger.info(`Playing message sent to ${channel.id} in ${msg.guildId}`)
      })
      .catch(() => {
        client.logger.error(
          `Failed to send playing message to ${channel.id} in ${channel.guild.id}`
        )
      })
  }
}

async function updateSetup(client: BaseClient, guild: any): Promise<void> {
  let m: Message

  const textChannel = guild.channels.cache.get(env.DISC_LOG_CHANNEL_ID) as TextChannel
  if (!textChannel) return
  try {
    const channel = client.channels.cache.get(env.DISC_LOG_CHANNEL_ID) as TextChannel
    const message = await channel.messages.fetch({ limit: 1 })
    m = await textChannel.messages.fetch({ message: message.first()!.id, cache: true })
  } catch (error) {
    client.logger.error(error)
  }

  // @ts-ignore
  if (m) {
    const player = client.queue.get(guild.id)
    if (player && player.current) {
      let iconUrl = client.icons[player.current.info.sourceName as keyof typeof client.icons]
      if (!iconUrl) iconUrl = client.user!.displayAvatarURL({ extension: 'png' })
      const embed = client
        .embed()
        .setAuthor({ name: `💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜`, iconURL: iconUrl })
        .setColor(client.color.main)
        .setDescription(
          `[${player.current.info.title}](${
            player.current.info.uri
          }) - \`[${client.utils.formatTime(
            player.current.info.length
          )}]\` - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚 ${player.current.info.requestedBy}`
        )
        .setImage(player.current.info.artworkUrl!)
      await m
        .edit({
          embeds: [embed],
          components: getButtons().map((b) => {
            b.components.forEach((c) => {
              c.setDisabled(!(player && player.current))
            })
            return b
          }),
        })
        .catch(() => {})
    } else {
      const embed = client
        .embed()
        .setColor(client.color.main)
        .setAuthor({
          name: client.user!.username,
          iconURL: client.user!.displayAvatarURL({ extension: 'png' }),
        })
        .setDescription(`𝙉𝙖𝙙𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙖`)
        .setImage(client.links.img)
      await m
        .edit({
          embeds: [embed],
          components: getButtons().map((b) => {
            b.components.forEach((c) => {
              c.setDisabled(true)
            })
            return b
          }),
        })
        .catch(() => {})
    }
  }
}

async function buttonReply(int: any, args: string, color: ColorResolvable): Promise<void> {
  const embed = new EmbedBuilder()
  let m: Message
  if (int.replied) {
    m = await int
      .editReply({ embeds: [embed.setColor(color).setDescription(args)] })
      .catch(() => {})
  } else {
    m = await int.followUp({ embeds: [embed.setColor(color).setDescription(args)] }).catch(() => {})
  }
  setTimeout(async () => {
    if (int && !int.ephemeral) {
      await m.delete().catch(() => {})
    }
  }, 2000)
}

async function oops(channel: TextChannel, args: string): Promise<void> {
  try {
    let embed1 = new EmbedBuilder().setColor('Red').setDescription(`${args}`)

    const m = await channel.send({
      embeds: [embed1],
    })

    setTimeout(async () => await m.delete().catch(() => {}), 12000)
  } catch (e) {
    return console.error(e)
  }
}

export { setupStart, trackStart, buttonReply, updateSetup, oops }

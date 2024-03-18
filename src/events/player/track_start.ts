import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  PermissionFlagsBits,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  TextChannel,
  UserSelectMenuInteraction,
} from 'discord.js'
import { Player } from 'shoukaku'

import { Dispatcher, Event, Mahina, Song } from '#common/index'
import { trackStart } from '#utils/setup_system'

export default class TrackStart extends Event {
  constructor(client: Mahina, file: string) {
    super(client, file, { name: 'trackStart' })
  }

  async run(player: Player, track: Song, dispatcher: Dispatcher): Promise<void> {
    const guild = this.client.guilds.cache.get(player.guildId)
    if (!guild) return
    const channel = guild.channels.cache.get(dispatcher.channelId) as TextChannel
    if (!channel) return
    this.client.utils.updateStatus(this.client, guild.id)

    function buttonBuilder(): ActionRowBuilder<ButtonBuilder> {
      const previousButton = new ButtonBuilder()
        .setCustomId('previous')
        .setEmoji('⏪')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!dispatcher.previous)

      const resumeButton = new ButtonBuilder()
        .setCustomId('resume')
        .setEmoji(player.paused ? '▶️' : '⏸️')
        .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Secondary)

      const stopButton = new ButtonBuilder()
        .setCustomId('stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
      const skipButton = new ButtonBuilder()
        .setCustomId('skip')
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Secondary)

      const loopButton = new ButtonBuilder()
        .setCustomId('loop')
        .setEmoji(dispatcher.loop === 'repeat' ? '🔂' : '🔁')
        .setStyle(dispatcher.loop !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)

      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        previousButton,
        resumeButton,
        stopButton,
        skipButton,
        loopButton
      )
    }

    const embed = this.client
      .embed()
      .setAuthor({
        name: '💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜',
        iconURL:
          this.client.icons[track.info.sourceName as keyof typeof this.client.icons] ??
          this.client.user!.displayAvatarURL({ extension: 'png' }),
      })
      .setColor(this.client.color.main)
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .setFooter({
        text: `𝙋𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙧 ${track.info.requestedBy.tag}`,
        iconURL: track.info.requestedBy.avatarURL()!,
      })
      .setThumbnail(track.info.artworkUrl!)
      .addFields(
        {
          name: '🕒 𝘿𝙪𝙧𝙖𝙘̧𝙖̃𝙤',
          value: track.info.isStream ? '🔴 𝙇𝙄𝙑𝙀' : this.client.utils.formatTime(track.info.length),
          inline: true,
        },
        { name: '✍️ 𝘼𝙪𝙩𝙝𝙤𝙧', value: track.info.author, inline: true }
      )
      .setTimestamp()
    let setup = await this.client.db.getSetup(guild.id)
    if (setup && setup.text_id) {
      const textChannel = guild.channels.cache.get(setup.text_id) as TextChannel
      const id = setup.message_id
      if (!textChannel) return
      if (channel && textChannel && channel.id === textChannel.id) {
        await trackStart(id, textChannel, dispatcher, track, this.client)
      } else {
        await trackStart(id, textChannel, dispatcher, track, this.client)
      }
    } else {
      const message = await channel.send({
        embeds: [embed],
        components: [buttonBuilder()],
      })
      dispatcher.nowPlayingMessage = message
      const collector = message.createMessageComponentCollector({
        filter: async (b) => {
          if (
            // @ts-ignore
            b.guild.members.me.voice.channel &&
            // @ts-ignore
            b.guild.members.me.voice.channelId === b.member.voice.channelId
          )
            return true
          else {
            b.reply({
              content: `𝙑𝙤𝙘𝙚̂ 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙤 𝙖 <#${
                // @ts-ignore
                b.guild.members.me.voice?.channelId ?? '𝙉𝙤𝙣𝙚'
              }> 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙨𝙚𝙨 𝙗𝙤𝙩𝙤̃𝙚𝙨.`,
              ephemeral: true,
            })
            return false
          }
        },
        //time: track.info.isStream ? 86400000 : track.info.length,
      })

      collector.on('collect', async (interaction) => {
        if (!(await checkDj(this.client, interaction))) {
          await interaction.reply({
            content: `🎭 𝙑𝙤𝙘𝙚̂ 𝙥𝙧𝙚𝙘𝙞𝙨𝙖 𝙩𝙚𝙧 𝙖 𝙛𝙪𝙣𝙘̧𝙖̃𝙤 𝙙𝙚 𝘿𝙅 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤.`,
            ephemeral: true,
          })
          return
        }
        switch (interaction.customId) {
          case 'previous':
            if (!dispatcher.previous) {
              await interaction.reply({
                content: `𝙉𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙖𝙣𝙩𝙚𝙧𝙞𝙤𝙧.`,
                ephemeral: true,
              })
              return
            } else dispatcher.previousTrack()
            if (message)
              await message.edit({
                embeds: [
                  embed.setFooter({
                    text: `𝙑𝙤𝙡𝙩𝙖𝙙𝙖 𝙥𝙤𝙧 ${interaction.user.tag}`,
                    iconURL: interaction.user.avatarURL({})!,
                  }),
                ],
                components: [buttonBuilder()],
              })
            break
          case 'resume':
            dispatcher.pause()
            if (message)
              await message.edit({
                embeds: [
                  embed.setFooter({
                    text: `${player.paused ? '𝙋𝙖𝙪𝙨𝙖𝙙𝙤' : '𝙍𝙚𝙨𝙪𝙢𝙞𝙙𝙤'} 𝙥𝙤𝙧 ${interaction.user.tag}`,
                    iconURL: interaction.user.avatarURL({})!,
                  }),
                ],
                components: [buttonBuilder()],
              })
            break
          case 'stop':
            dispatcher.stop()
            if (message)
              await message.edit({
                embeds: [
                  embed.setFooter({
                    text: `𝙋𝙖𝙧𝙖𝙙𝙖 𝙥𝙤𝙧 ${interaction.user.tag}`,
                    iconURL: interaction.user.avatarURL({})!,
                  }),
                ],
                components: [],
              })
            break
          case 'skip':
            if (!dispatcher.queue.length) {
              await interaction.reply({
                content: `𝙉𝙖̃𝙤 𝙝𝙖́ 𝙢𝙖𝙞𝙨 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙣𝙖 𝙛𝙞𝙡𝙖.`,
                ephemeral: true,
              })
              return
            }
            dispatcher.skip()
            if (message)
              await message.edit({
                embeds: [
                  embed.setFooter({
                    text: `𝙄𝙜𝙣𝙤𝙧𝙖𝙙𝙖 𝙥𝙤𝙧 ${interaction.user.tag}`,
                    iconURL: interaction.user.avatarURL({})!,
                  }),
                ],
                components: [],
              })
            break
          case 'loop':
            switch (dispatcher.loop) {
              case 'off':
                dispatcher.loop = 'repeat'
                if (message)
                  await message.edit({
                    embeds: [
                      embed.setFooter({
                        text: `𝙇𝙤𝙤𝙥 𝙥𝙤𝙧 ${interaction.user.tag}`,
                        iconURL: interaction.user.avatarURL({})!,
                      }),
                    ],
                    components: [buttonBuilder()],
                  })
                break
              case 'repeat':
                dispatcher.loop = 'queue'
                if (message)
                  await message.edit({
                    embeds: [
                      embed.setFooter({
                        text: `𝙁𝙞𝙡𝙖 𝙚𝙢 𝙡𝙤𝙤𝙥 𝙥𝙤𝙧 ${interaction.user.tag}`,
                        iconURL: interaction.user.avatarURL({})!,
                      }),
                    ],
                    components: [buttonBuilder()],
                  })
                break
              case 'queue':
                dispatcher.loop = 'off'
                if (message)
                  await message.edit({
                    embeds: [
                      embed.setFooter({
                        text: `𝙇𝙤𝙤𝙥 𝙩𝙚𝙧𝙢𝙞𝙣𝙖𝙙𝙤 𝙥𝙤𝙧 ${interaction.user.tag}`,
                        iconURL: interaction.user.avatarURL({})!,
                      }),
                    ],
                    components: [buttonBuilder()],
                  })
                break
            }
            break
        }
        await interaction.deferUpdate()
      })
    }
  }
}

export async function checkDj(
  client: Mahina,
  interaction:
    | ButtonInteraction<'cached'>
    | StringSelectMenuInteraction<'cached'>
    | UserSelectMenuInteraction<'cached'>
    | RoleSelectMenuInteraction<'cached'>
    | MentionableSelectMenuInteraction<'cached'>
    | ChannelSelectMenuInteraction<'cached'>
): Promise<boolean> {
  const dj = await client.db.getDj(interaction.guildId)
  if (dj && dj.mode) {
    const djRole = await client.db.getRoles(interaction.guildId)
    if (!djRole) return false

    const findDJRole = interaction.member.roles.cache.find((x: any) =>
      djRole.map((y) => y.role_id).includes(x.id)
    )
    if (!findDJRole) return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
  }
  return true
}

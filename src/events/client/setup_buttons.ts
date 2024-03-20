import { Event, BaseClient } from '#common/index'
import { buttonReply } from '#utils/setup_system'
import { checkDj } from '#src/events/player/track_start'

export default class SetupButtons extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'setupButtons' })
  }

  async run(interaction: any): Promise<void> {
    if (!interaction.replied) await interaction.deferReply().catch(() => {})

    if (!interaction.member.voice.channel)
      return await buttonReply(
        interaction,
        `𝙈𝙖𝙣𝙖̃..𝙗𝙪𝙧𝙧𝙚 🤭 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙖 𝙪𝙢𝙚 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙫𝙤𝙯 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙗𝙤𝙩𝙖̃𝙤.`,
        this.client.color.red
      )
    if (
      interaction.guild.members.cache.get(this.client!.user!.id).voice.channel &&
      interaction.guild.members.cache.get(this.client!.user!.id).voice.channelId !==
        interaction.member.voice.channelId
    )
      return await buttonReply(
        interaction,
        `𝙈𝙖𝙣𝙖̃..𝙗𝙪𝙧𝙧𝙚 🤭 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙖 ${interaction.guild.me.voice.channel}  𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙗𝙤𝙩𝙖̃𝙤.`,
        this.client.color.red
      )
    const player = this.client.queue.get(interaction.guildId)
    if (!player)
      return await buttonReply(
        interaction,
        `𝙈𝙖𝙣𝙖̃..𝙗𝙪𝙧𝙧𝙚 🤭 𝙣𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧.`,
        this.client.color.red
      )
    if (!player.queue)
      return await buttonReply(
        interaction,
        `𝙈𝙖𝙣𝙖̃..𝙗𝙪𝙧𝙧𝙚 🤭 𝙣𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧.`,
        this.client.color.red
      )
    if (!player.current)
      return await buttonReply(
        interaction,
        `𝙈𝙖𝙣𝙖̃..𝙗𝙪𝙧𝙧𝙚 🤭 𝙣𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙚𝙨𝙩𝙚 𝙨𝙚𝙧𝙫𝙞𝙙𝙤𝙧.`,
        this.client.color.red
      )
    const data = await this.client.db.getSetup(interaction.guildId)
    const { title, uri, length } = player.current.info
    let message
    try {
      message = await interaction.channel.messages.fetch(data.message_id, { cache: true })
    } catch (e) {
      this.client.logger.error(e)
    }
    const icon = player
      ? player.current.info.artworkUrl
      : this.client.user!.displayAvatarURL({ extension: 'png' })
    let iconUrl =
      this.client.icons[player.current.info.sourceName as keyof typeof this.client.icons]
    if (!iconUrl) iconUrl = this.client.user!.displayAvatarURL({ extension: 'png' })

    const embed = this.client
      .embed()
      .setAuthor({ name: `💿 𝙉𝙤𝙬 𝙋𝙡𝙖𝙮𝙞𝙣𝙜`, iconURL: iconUrl })
      .setDescription(
        `[${title}](${uri}) - ${
          player.current.info.isStream ? 'LIVE' : this.client.utils.formatTime(length)
        } - 𝙥𝙚𝙙𝙞𝙙𝙖 𝙥𝙤𝙚 ${player.current.info.requestedBy}`
      )
      .setImage(icon!)
    if (!interaction.isButton()) return
    if (!(await checkDj(this.client, interaction))) {
      await buttonReply(interaction, `𝙢𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙚 𝘿𝙅 𝙥𝙧𝙖 𝙪𝙨𝙖𝙧 𝙞𝙘̧𝙤..`, this.client.color.red)
      return
    }
    if (message) {
      switch (interaction.customId) {
        case 'LOW_VOL_BUT': {
          const vol = player.player.volume - 10
          player.player.setGlobalVolume(vol)
          await buttonReply(interaction, `𝙑𝙤𝙡𝙪𝙢𝙚 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙤 𝙥𝙧𝙖 ${vol}%`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙑𝙤𝙡𝙪𝙢𝙚: ${vol}%`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        case 'HIGH_VOL_BUT': {
          const vol2 = player.player.volume + 10
          player.player.setGlobalVolume(vol2)
          await buttonReply(interaction, `𝙑𝙤𝙡𝙪𝙢𝙚 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙤 𝙥𝙧𝙖 ${vol2}%`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙑𝙤𝙡𝙪𝙢𝙚: ${vol2}%`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        case 'PAUSE_BUT': {
          const name = player.player.paused ? `𝙍𝙚𝙨𝙪𝙢𝙞𝙙𝙤` : `𝙋𝙖𝙪𝙨𝙖𝙙𝙤`
          player.pause()
          await buttonReply(interaction, `${name} 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `${name} by ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        case 'SKIP_BUT':
          if (player.queue.length === 0)
            return await buttonReply(
              interaction,
              `𝙉𝙖̃𝙤 𝙝𝙖́ 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙥𝙖𝙧𝙖 𝙥𝙪𝙡𝙖𝙧 𝙗𝙪𝙧𝙧𝙚 🤭`,
              this.client.color.main
            )
          player.skip()
          await buttonReply(interaction, `𝙈𝙪́𝙨𝙞𝙘𝙖 𝙥𝙪𝙡𝙖𝙙𝙖.`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙥𝙪𝙡𝙖𝙙𝙖 𝙥𝙤𝙧 ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        case 'STOP_BUT':
          player.stop()
          await buttonReply(interaction, `𝙈𝙪́𝙨𝙞𝙘𝙖 𝙥𝙖𝙧𝙖𝙙𝙖`, this.client.color.main)
          await message.edit({
            embeds: [
              embed
                .setFooter({
                  text: `𝙥𝙖𝙧𝙖𝙙𝙖 𝙥𝙤𝙧 ${interaction.member.displayName}`,
                  iconURL: interaction.member.displayAvatarURL({}),
                })
                .setDescription(`𝙉𝙖𝙙𝙚 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙖𝙜𝙤𝙧𝙚.`)
                .setImage(this.client.links.img)
                .setAuthor({
                  name: this.client.user!.username,
                  iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }),
                }),
            ],
          })
          break
        case 'LOOP_BUT': {
          const random = ['off', 'queue', 'repeat']
          const loop = random[Math.floor(Math.random() * random.length)]
          if (player.loop === loop)
            return await buttonReply(
              interaction,
              `𝙏𝙖́ 𝙡𝙤𝙤𝙥𝙖𝙣𝙙𝙚 𝙢𝙖𝙣𝙖̃ ${player.loop}.`,
              this.client.color.main
            )
          player.setLoop(loop)
          await buttonReply(
            interaction,
            `𝙇𝙤𝙤𝙥 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙚 𝙥𝙧𝙖 ${player.loop}.`,
            this.client.color.main
          )
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙡𝙤𝙤𝙥 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙚 𝙥𝙧𝙖 ${player.loop} 𝙥𝙤𝙧 ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        case 'SHUFFLE_BUT':
          player.setShuffle(!player.shuffle)
          await buttonReply(
            interaction,
            `𝘼𝙡𝙚𝙖𝙩𝙤́𝙧𝙞𝙤 𝙙𝙚𝙛𝙞𝙣𝙞𝙙𝙤 𝙘𝙤𝙢𝙤 ${player.shuffle ? `𝙖𝙩𝙞𝙫𝙚` : `𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙚`}.`,
            this.client.color.main
          )
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙖𝙡𝙚𝙖𝙩𝙤́𝙧𝙞𝙤 𝙙𝙚𝙛𝙞𝙣𝙞𝙩𝙚 𝙘𝙤𝙢𝙤 ${player.shuffle ? `𝙖𝙩𝙞𝙫𝙚` : `𝙙𝙚𝙨𝙖𝙩𝙞𝙫𝙖𝙙𝙚`} 𝙥𝙤𝙚 ${
                  interaction.member.displayName
                }`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        case 'PREV_BUT':
          if (!player.previous)
            return await buttonReply(
              interaction,
              `𝙉𝙖̃𝙤 𝙝𝙖́ 𝙛𝙖𝙞𝙭𝙖 𝙖𝙣𝙩𝙚𝙧𝙞𝙤𝙧 𝙢𝙖𝙣𝙖̃..`,
              this.client.color.main
            )
          player.previousTrack()
          await buttonReply(interaction, `𝙏𝙤𝙘𝙖𝙣𝙙𝙤 𝙛𝙖𝙞𝙭𝙖 𝙖𝙣𝙩𝙚𝙧𝙞𝙤𝙧.. 𝙢𝙖𝙣𝙖̃..`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙛𝙖𝙞𝙭𝙖 𝙖𝙣𝙩𝙚𝙧𝙞𝙤𝙧 𝙥𝙤𝙚 ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        case 'REWIND_BUT': {
          const time = player.player.position - 10000
          if (time < 0)
            return await buttonReply(
              interaction,
              `𝙈𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙧𝙚𝙩𝙧𝙤𝙘𝙚𝙙𝙚𝙧 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙖𝙡𝙚́𝙢 𝙙𝙖 𝙙𝙪𝙧𝙖𝙘̧𝙖̃𝙤 𝙙𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖.. 𝙗𝙪𝙧𝙧𝙚 🤭`,
              this.client.color.main
            )
          player.seek(time)
          await buttonReply(interaction, `𝙍𝙚𝙗𝙤𝙗𝙞𝙣𝙤𝙪 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖.`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙧𝙚𝙗𝙤𝙗𝙞𝙣𝙖𝙙𝙚 𝙥𝙤𝙚 ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        case 'FORWARD_BUT': {
          const time2 = player.player.position + 10000
          if (time2 > player.current.info.length)
            return await buttonReply(
              interaction,
              `𝙈𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙖𝙫𝙖𝙣𝙘̧𝙖𝙧 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖 𝙖𝙡𝙚́𝙢 𝙙𝙖 𝙙𝙪𝙧𝙖𝙘̧𝙖̃𝙤 𝙙𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖.. 𝙗𝙪𝙧𝙧𝙚 🤭`,
              this.client.color.main
            )
          player.seek(time2)
          await buttonReply(interaction, `𝘼𝙫𝙖𝙣𝙘̧𝙤𝙪 𝙖 𝙢𝙪́𝙨𝙞𝙘𝙖.`, this.client.color.main)
          await message.edit({
            embeds: [
              embed.setFooter({
                text: `𝙖𝙫𝙖𝙣𝙘̧𝙖𝙙𝙖 𝙥𝙤𝙚 ${interaction.member.displayName}`,
                iconURL: interaction.member.displayAvatarURL({}),
              }),
            ],
          })
          break
        }
        default:
          await buttonReply(interaction, `𝙀𝙨𝙩𝙚 𝙗𝙤𝙩𝙖̃𝙤 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙙𝙞𝙨𝙥𝙤𝙣𝙞́𝙫𝙚𝙡.`, this.client.color.main)
          break
      }
    }
  }
}

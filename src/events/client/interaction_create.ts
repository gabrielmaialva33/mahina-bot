import {
  AutocompleteInteraction,
  ChannelType,
  Collection,
  CommandInteraction,
  GuildMember,
  InteractionType,
  PermissionFlagsBits,
} from 'discord.js'

import { BaseClient } from '#common/base_client'
import { Event } from '#common/event'
import { Context } from '#common/context'
import { LoadType } from 'shoukaku'

export default class InteractionCreate extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'interactionCreate' })
  }

  async run(interaction: CommandInteraction | AutocompleteInteraction): Promise<any> {
    if (
      interaction instanceof CommandInteraction &&
      interaction.type === InteractionType.ApplicationCommand
    ) {
      const { commandName } = interaction
      const command = this.client.commands.get(interaction.commandName)
      if (!command) return

      const ctx = new Context(interaction as any, interaction.options.data as any)
      ctx.setArgs(interaction.options.data as any)

      if (
        !interaction.inGuild() ||
        !interaction
          .channel!.permissionsFor(interaction.guild!.members.me!)
          .has(PermissionFlagsBits.ViewChannel)
      )
        return

      if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.SendMessages)) {
        return await (interaction.member as GuildMember)
          .send({
            content: `𝙉𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙙𝙚 **\`SendMessage\`** 𝙚𝙣𝙫𝙞𝙖𝙧 𝙢𝙚𝙣𝙨𝙖𝙜𝙚𝙣𝙨 𝙣𝙚𝙨𝙨𝙚 𝙘𝙖𝙣𝙖𝙡 \`${interaction.guild!.name}\`\n𝘾𝙖𝙣𝙖𝙡: <#${interaction.channelId}>`,
          })
          .catch(() => {})
      }

      if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.EmbedLinks))
        return await interaction.reply({ content: '𝙉𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙙𝙚 **`EmbedLinks`** .' })

      if (command.permissions) {
        if (command.permissions.client)
          if (!interaction.guild!.members.me!.permissions.has(command.permissions.client))
            return await interaction.reply({
              content: "'𝙈𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙩𝙚𝙢 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨 𝙨𝙪𝙛𝙞𝙘𝙞𝙚𝙣𝙩𝙚𝙨 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.",
            })

        if (command.permissions.user) {
          if (!(interaction.member as GuildMember).permissions.has(command.permissions.user)) {
            await interaction.reply({
              content: '𝙈𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙩𝙚𝙢 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙤̃𝙚𝙨 𝙨𝙪𝙛𝙞𝙘𝙞𝙚𝙣𝙩𝙚𝙨 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.',
              ephemeral: true,
            })
            return
          }
        }
        if (command.permissions.dev) {
          if (this.client.env.DISC_OWNER_IDS) {
            const findDev = this.client.env.DISC_OWNER_IDS.split(',').find(
              (x) => x === interaction.user.id
            )
            if (!findDev) return
          }
        }
      }
      if (command.player) {
        if (command.player.voice) {
          if (!(interaction.member as GuildMember).voice.channel)
            return await interaction.reply({
              content: `𝙈𝙖𝙣𝙖̃.. 𝙣𝙖̃𝙤 𝙫𝙤 𝙛𝙞𝙘𝙖𝙚 𝙨𝙤𝙯𝙞𝙣𝙝𝙚..🥺𝙚𝙣𝙩𝙧𝙖 𝙘𝙤𝙢𝙞𝙜𝙪 𝙘𝙤𝙢 𝙚𝙘̧𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚. \`${command.name}\` .`,
            })

          if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
            return await interaction.reply({
              content: `𝙈𝙖𝙣𝙖̃..🥺 𝙣𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 \`CONNECT\` 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙥𝙧𝙖 𝙚𝙣𝙩𝙧𝙖𝙚 𝙚 𝙧𝙤𝙙𝙖 \`${command.name}\` 𝙘̧𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
            })

          if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
            return await interaction.reply({
              content: `𝙈𝙖𝙣𝙖̃..🥺 𝙣𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤  \`SPEAK\` 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙥𝙧𝙖 𝙛𝙖𝙡𝙖𝙚 𝙚 𝙧𝙤𝙙𝙖 \`${command.name}\` 𝙚𝙘̧𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
            })

          if (
            (interaction.member as GuildMember).voice.channel!.type ===
              ChannelType.GuildStageVoice &&
            !interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.RequestToSpeak)
          )
            return await interaction.reply({
              content: `𝙈𝙖𝙣𝙖̃..🥺 𝙣𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 \`REQUEST TO SPEAK\` 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙥𝙧𝙖 𝙛𝙖𝙡𝙖𝙚 𝙚 𝙧𝙤𝙙𝙖 \`${command.name}\` 𝙚𝙘̧𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.`,
            })
          if (interaction.guild!.members.me!.voice.channel) {
            if (
              interaction.guild!.members.me!.voice.channelId !==
              (interaction.member as GuildMember).voice.channelId
            )
              return await interaction.reply({
                content: `𝙈𝙖𝙣𝙖̃..🥺 𝙫𝙘 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 <#${interaction.guild!.members.me!.voice.channel.id}> 𝙪𝙨𝙚 𝙤 𝙘𝙤𝙢𝙖𝙣𝙙𝙤 \`${command.name}\` .`,
              })
          }
        }
        if (command.player.active) {
          if (!this.client.queue.get(interaction.guildId))
            return await interaction.reply({
              content: '𝙉𝙖̃𝙤 𝙩𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙖𝙙𝙚 𝙢𝙖𝙣𝙖̃..',
            })

          if (!this.client.queue.get(interaction.guildId).queue)
            return await interaction.reply({
              content: '𝙉𝙖̃𝙤 𝙩𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙖𝙙𝙚 𝙢𝙖𝙣𝙖̃..',
            })

          if (!this.client.queue.get(interaction.guildId).current)
            return await interaction.reply({
              content: '𝙉𝙖̃𝙤 𝙩𝙖 𝙩𝙤𝙘𝙖𝙣𝙙𝙤 𝙣𝙖𝙙𝙚 𝙢𝙖𝙣𝙖̃..',
            })
        }
        if (command.player.dj) {
          const dj = await this.client.db.getDj(interaction.guildId)
          if (dj && dj.mode) {
            const djRole = await this.client.db.getRoles(interaction.guildId)
            if (!djRole)
              return await interaction.reply({
                content: '𝙉𝙖̃𝙤 𝙩𝙚𝙢 𝙧𝙤𝙡𝙚 𝙙𝙚 𝘿𝙅 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤.',
              })
            const findDJRole = (interaction.member as GuildMember).roles.cache.find((x: any) =>
              djRole.map((y: any) => y.role_id).includes(x.id)
            )
            if (!findDJRole) {
              if (
                !(interaction.member as GuildMember).permissions.has(
                  PermissionFlagsBits.ManageGuild
                )
              ) {
                return await interaction.reply({
                  content: '𝙈𝙖𝙣𝙖̃.. 𝙤𝙘𝙚 𝙥𝙧𝙚𝙘𝙞𝙨𝙖 𝙩𝙚𝙧 𝙤 𝙘𝙖𝙧𝙜𝙤 𝙙𝙚 𝘿𝙅 𝙥𝙖𝙧𝙖 𝙪𝙨𝙖𝙧 𝙚𝙨𝙩𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙚.',
                  ephemeral: true,
                })
              }
            }
          }
        }
      }

      if (!this.client.cooldown.has(commandName))
        this.client.cooldown.set(commandName, new Collection())

      const now = Date.now()
      const timestamps = this.client.cooldown.get(commandName)

      const cooldownAmount = Math.floor(command.cooldown || 5) * 1000
      if (!timestamps.has(interaction.user.id)) {
        timestamps.set(interaction.user.id, now)
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)
      } else {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount
        const timeLeft = (expirationTime - now) / 1000
        if (now < expirationTime && timeLeft > 0.9) {
          return await interaction.reply({
            content: `𝙈𝙖𝙣𝙖̃..🥺 𝙚𝙨𝙥𝙚𝙧𝙖 ${timeLeft.toFixed(
              1
            )} 𝙪𝙣𝙨 𝙨𝙚𝙜𝙪𝙣𝙙𝙚𝙨 𝙥𝙧𝙖 𝙪𝙨𝙖𝙧 𝙤 𝙘𝙤𝙢𝙖𝙣𝙙𝙚 \`${commandName}\` .`,
          })
        }
        timestamps.set(interaction.user.id, now)
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)
      }
      if (
        interaction.options.data.some(
          (option) => option.value && option.value.toString().includes('@everyone')
        ) ||
        interaction.options.data.some(
          (option) => option.value && option.value.toString().includes('@here')
        )
      )
        return await interaction.reply({
          content: '𝙈𝙖𝙣𝙖̃..🥺 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙥𝙤𝙙𝙚 𝙢𝙚𝙣𝙘𝙞𝙤𝙣𝙖𝙧 𝙩𝙤𝙙𝙚𝙨..',
          ephemeral: true,
        })
      try {
        await command.run(this.client, ctx, ctx.args)
      } catch (error) {
        this.client.logger.error(error)
        await interaction.reply({ content: `🥺 𝙢𝙖𝙣𝙖̃.. 𝙤𝙪𝙫𝙚 𝙪𝙢 𝙚𝙧𝙧𝙤𝙧 : \`${error}\`` })
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      if (interaction.commandName === 'play') {
        const song = interaction.options.getString('song')
        if (!song) return

        const res = await this.client.queue.search(song)
        if (!res) return

        let songs: { name: any; value: any }[] = []
        switch (res.loadType) {
          case LoadType.SEARCH:
            if (!res.data.length) return
            res.data.slice(0, 10).forEach((x) => {
              songs.push({ name: x.info.title, value: x.info.uri })
            })
            break
          default:
            break
        }

        return await interaction.respond(songs).catch(() => {})
      }
    }
  }
}

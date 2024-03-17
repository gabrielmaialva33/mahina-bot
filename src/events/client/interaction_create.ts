import {
  AutocompleteInteraction,
  ChannelType,
  Collection,
  CommandInteraction,
  GuildMember,
  InteractionType,
  PermissionFlagsBits,
} from 'discord.js'

import { Mahina } from '#common/mahina'
import { Event } from '#common/event'
import { Context } from '#common/context'

export default class InteractionCreate extends Event {
  constructor(client: Mahina, file: string) {
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
            content: `I don't have **\`SendMessage\`** permission in \`${interaction.guild!.name}\`\nchannel: <#${interaction.channelId}>`,
          })
          .catch(() => {})
      }

      if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.EmbedLinks))
        return await interaction.reply({ content: "I don't have **`EmbedLinks`** permission." })

      if (command.permissions) {
        if (command.permissions.client)
          if (!interaction.guild!.members.me!.permissions.has(command.permissions.client))
            return await interaction.reply({
              content: "I don't have enough permissions to execute this command.",
            })

        if (command.permissions.user) {
          if (!(interaction.member as GuildMember).permissions.has(command.permissions.user)) {
            await interaction.reply({
              content: "You don't have enough permissions to use this command.",
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
              content: `You must be connected to a voice channel to use this \`${command.name}\` command.`,
            })

          if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
            return await interaction.reply({
              content: `I don't have \`CONNECT\` permissions to execute this \`${command.name}\` command.`,
            })

          if (!interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.Speak))
            return await interaction.reply({
              content: `I don't have \`SPEAK\` permissions to execute this \`${command.name}\` command.`,
            })

          if (
            (interaction.member as GuildMember).voice.channel!.type ===
              ChannelType.GuildStageVoice &&
            !interaction.guild!.members.me!.permissions.has(PermissionFlagsBits.RequestToSpeak)
          )
            return await interaction.reply({
              content: `I don't have \`REQUEST TO SPEAK\` permission to execute this \`${command.name}\` command.`,
            })
          if (interaction.guild!.members.me!.voice.channel) {
            if (
              interaction.guild!.members.me!.voice.channelId !==
              (interaction.member as GuildMember).voice.channelId
            )
              return await interaction.reply({
                content: `You are not connected to <#${interaction.guild!.members.me!.voice.channel.id}> to use this \`${command.name}\` command.`,
              })
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
            content: `Please wait ${timeLeft.toFixed(
              1
            )} more second(s) before reusing the \`${commandName}\` command.`,
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
          content: "You can't mention everyone or here.",
          ephemeral: true,
        })
      try {
        await command.run(this.client, ctx, ctx.args)
      } catch (error) {
        console.error(error)
        await interaction.reply({ content: `An error occurred: \`${error}\`` })
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      console.log(`Autocomplete interaction detected`)
    }
  }
}

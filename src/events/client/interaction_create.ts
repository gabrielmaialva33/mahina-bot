import {
  ActionRowBuilder,
  type AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  CommandInteraction,
  EmbedBuilder,
  type GuildMember,
  InteractionType,
  MessageFlags,
  PermissionFlagsBits,
  type TextChannel,
} from 'discord.js'
import Event from '#common/event'
import Context from '#common/context'
import type MahinaBot from '#common/mahina_bot'
import { T } from '#common/i18n'
import {
  getCooldownTimeLeft,
  getMissingClientPermissions,
  hasDjAccess,
  isCommandCategoryEnabled,
} from '#common/command_runtime'

export default class InteractionCreate extends Event {
  constructor(client: MahinaBot, file: string) {
    super(client, file, {
      name: 'interactionCreate',
    })
  }

  async run(interaction: CommandInteraction | AutocompleteInteraction): Promise<any> {
    if (!(interaction.guild && interaction.guildId)) return
    if (interaction instanceof CommandInteraction && interaction.isCommand()) {
      const setup = await this.client.db.getSetup(interaction.guildId)
      const allowedCategories = ['filters', 'music', 'playlist']
      const commandInSetup = this.client.commands.get(interaction.commandName)
      const locale = await this.client.db.getLanguage(interaction.guildId)

      if (
        setup &&
        interaction.channelId === setup.textId &&
        !(commandInSetup && allowedCategories.includes(commandInSetup.category))
      ) {
        return await interaction.reply({
          content: T(locale, 'event.interaction.setup_channel'),
          flags: MessageFlags.Ephemeral,
        })
      }

      const { commandName } = interaction
      await this.client.db.get(interaction.guildId)

      const command = this.client.commands.get(commandName)
      if (!command) return

      if (!isCommandCategoryEnabled(this.client, command.category)) {
        return await interaction.reply({
          content: T(locale, 'event.interaction.error', {
            error: `${command.category} commands are currently disabled`,
          }),
          flags: MessageFlags.Ephemeral,
        })
      }

      const ctx = new Context(interaction as any, interaction.options.data as any)
      ctx.setArgs(interaction.options.data as any)
      ctx.guildLocale = locale
      const clientMember = interaction.guild.members.resolve(this.client.user!)!
      if (
        !(
          interaction.inGuild() &&
          interaction.channel?.permissionsFor(clientMember)?.has(PermissionFlagsBits.ViewChannel)
        )
      )
        return

      if (
        !(
          clientMember.permissions.has(PermissionFlagsBits.ViewChannel) &&
          clientMember.permissions.has(PermissionFlagsBits.SendMessages) &&
          clientMember.permissions.has(PermissionFlagsBits.EmbedLinks) &&
          clientMember.permissions.has(PermissionFlagsBits.ReadMessageHistory)
        )
      ) {
        return await (interaction.member as GuildMember)
          .send({
            content: T(locale, 'event.interaction.no_send_message'),
          })
          .catch(() => {
            null
          })
      }

      const logs = this.client.channels.cache.get(this.client.env.LOG_COMMANDS_ID!)

      if (command.permissions) {
        if (command.permissions?.client) {
          const missingClientPermissions = getMissingClientPermissions(
            clientMember,
            command.permissions.client
          )

          if (missingClientPermissions.length > 0) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_permission', {
                permissions: missingClientPermissions
                  .map((perm: string) => `\`${perm}\``)
                  .join(', '),
              }),
              flags: MessageFlags.Ephemeral,
            })
          }
        }

        if (
          command.permissions?.user &&
          !(interaction.member as GuildMember).permissions.has(command.permissions.user)
        ) {
          await interaction.reply({
            content: T(locale, 'event.interaction.no_user_permission'),
            flags: MessageFlags.Ephemeral,
          })
          return
        }

        if (command.permissions?.dev && this.client.env.OWNER_IDS) {
          const isDev = this.client.env.OWNER_IDS.includes(interaction.user.id)
          if (!isDev) return
        }
      }
      if (command.vote && this.client.topGG) {
        const voted = await this.client.topGG.hasVoted(interaction.user.id)
        if (!voted) {
          const voteBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(T(locale, 'event.interaction.vote_button'))
              .setURL(`https://top.gg/bot/${this.client.user?.id}/vote`)
              .setStyle(ButtonStyle.Link)
          )

          return await interaction.reply({
            content: T(locale, 'event.interaction.vote_message'),
            components: [voteBtn],
            flags: MessageFlags.Ephemeral,
          })
        }
      }
      if (command.player) {
        if (command.player.voice) {
          if (!(interaction.member as GuildMember).voice.channel) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_voice_channel', { command: command.name }),
            })
          }

          if (!clientMember.permissions.has(PermissionFlagsBits.Connect)) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_connect_permission', {
                command: command.name,
              }),
            })
          }

          if (!clientMember.permissions.has(PermissionFlagsBits.Speak)) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_speak_permission', {
                command: command.name,
              }),
            })
          }

          if (
            (interaction.member as GuildMember).voice.channel?.type ===
              ChannelType.GuildStageVoice &&
            !clientMember.permissions.has(PermissionFlagsBits.RequestToSpeak)
          ) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_request_to_speak', {
                command: command.name,
              }),
            })
          }

          if (
            clientMember.voice.channel &&
            clientMember.voice.channelId !== (interaction.member as GuildMember).voice.channelId
          ) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.different_voice_channel', {
                channel: `<#${clientMember.voice.channelId}>`,
                command: command.name,
              }),
            })
          }
        }

        if (command.player.active) {
          if (!this.client.runtime.music) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.error', {
                error: 'Music runtime is disabled',
              }),
              flags: MessageFlags.Ephemeral,
            })
          }

          const queue = this.client.manager.getPlayer(interaction.guildId)
          if (!queue?.queue.current) {
            return await interaction.reply({
              content: T(locale, 'event.interaction.no_music_playing'),
            })
          }
        }

        if (command.player.dj) {
          const dj = await this.client.db.getDj(interaction.guildId)
          if (dj?.mode) {
            const djRole = await this.client.db.getRoles(interaction.guildId)
            if (!djRole) {
              return await interaction.reply({
                content: T(locale, 'event.interaction.no_dj_role'),
              })
            }

            const member = interaction.member as GuildMember
            if (
              !hasDjAccess(
                member,
                djRole.map((role) => role.roleId)
              )
            ) {
              return await interaction.reply({
                content: T(locale, 'event.interaction.no_dj_permission'),
                flags: MessageFlags.Ephemeral,
              })
            }
          }
        }
      }

      const timeLeft = getCooldownTimeLeft(
        this.client.cooldown,
        commandName,
        interaction.user.id,
        command.cooldown || 5
      )
      if (timeLeft) {
        return await interaction.reply({
          content: T(locale, 'event.interaction.cooldown', {
            time: timeLeft.toFixed(1),
            command: commandName,
          }),
        })
      }

      try {
        await command.run(this.client, ctx, ctx.args)
        if (
          setup &&
          interaction.channelId === setup.textId &&
          allowedCategories.includes(command.category)
        ) {
          setTimeout(() => {
            interaction.deleteReply().catch(() => {
              null
            })
          }, 5000)
        }
        if (logs) {
          const embed = new EmbedBuilder()
            .setAuthor({
              name: 'Slash - Command Logs',
              iconURL: this.client.user?.avatarURL({ size: 2048 })!,
            })
            .setColor(this.client.config.color.blue)
            .addFields(
              { name: 'Command', value: `\`${command.name}\``, inline: true },
              {
                name: 'User',
                value: `${interaction.user.tag} (\`${interaction.user.id}\`)`,
                inline: true,
              },
              {
                name: 'Guild',
                value: `${interaction.guild.name} (\`${interaction.guild.id}\`)`,
                inline: true,
              }
            )
            .setTimestamp()

          await (logs as TextChannel).send({ embeds: [embed] })
        }
      } catch (error) {
        this.client.logger.error(error)
        await interaction.reply({
          content: T(locale, 'event.interaction.error', { error }),
        })
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = this.client.commands.get(interaction.commandName)
      if (!command) return

      this.client.logger.debug(
        `Autocomplete received: ${interaction.commandName} (${interaction.options.getFocused(true)?.value ?? ''})`
      )

      try {
        if (!command.autocomplete) {
          this.client.logger.warn(
            `Autocomplete handler missing for command: ${interaction.commandName}`
          )
          return
        }

        await command.autocomplete(interaction)
      } catch (error) {
        this.client.logger.error(`Autocomplete failed for ${interaction.commandName}:`, error)
      }
    }
  }
}

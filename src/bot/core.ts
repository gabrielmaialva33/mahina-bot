import {
  ApplicationCommandDataResolvable,
  ChatInputCommandInteraction,
  Client,
  Collection,
  Events,
  Interaction,
  REST,
  Routes,
  Snowflake,
} from 'discord.js'
import { Command } from '#src/interfaces/command'
import { env } from '#src/env'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MissingPermissionsException } from '#src/exceptions/missing_permissions.exception'
import { checkPermissions, PermissionResult } from '#src/utils/check_permissions.util'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url)
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename)

export class Bot {
  readonly prefixes = ['/', '!']

  commands = new Collection<string, Command>()
  slashCommands: ApplicationCommandDataResolvable[] = []
  slashCommandsMap = new Collection<string, Command>()
  cooldowns = new Collection<string, Collection<Snowflake, number>>()

  constructor(readonly client: Client) {
    this.client.login(env.DISC_BOT_TOKEN)

    this.client.on('ready', () => {
      this.registerSlashCommands()
      this.onInteractionCreate()
    })
  }

  private async registerSlashCommands() {
    const rest = new REST({ version: '9' }).setToken(env.DISC_BOT_TOKEN)

    const commandFiles = readdirSync(join(__dirname, 'commands')).filter((file) =>
      file.endsWith('.js')
    )

    for (const file of commandFiles) {
      const command = await import(join(__dirname, 'commands', `${file}`))

      this.slashCommands.push(command.default.data)
      this.slashCommandsMap.set(command.default.data.name, command.default)
    }

    await rest.put(Routes.applicationCommands(this.client.user!.id), { body: this.slashCommands })
  }

  private async onInteractionCreate() {
    this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<any> => {
      if (!interaction.isChatInputCommand()) return

      const command = this.slashCommandsMap.get(interaction.commandName)
      if (!command) return

      if (!this.cooldowns.has(interaction.commandName))
        this.cooldowns.set(interaction.commandName, new Collection())

      const now = Date.now()
      const timestamps = this.cooldowns.get(interaction.commandName)!
      const cooldownAmount = (command.cooldown || 1) * 1000

      const timestamp = timestamps.get(interaction.user.id)

      if (timestamp) {
        const expirationTime = timestamp + cooldownAmount

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000
          return interaction.reply({
            content: `Por favor, espere ${timeLeft.toFixed(1)} segundo(s) antes de reutilizar o comando.`,
            ephemeral: true,
          })
        }
      }

      timestamps.set(interaction.user.id, now)
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)

      try {
        const permissionsCheck: PermissionResult = await checkPermissions(command, interaction)

        if (permissionsCheck.result) {
          command.execute(interaction as ChatInputCommandInteraction)
        } else {
          throw new MissingPermissionsException(permissionsCheck.missing)
        }
      } catch (error: any) {
        console.error(error)

        if (error.message.includes('permissions')) {
          interaction.reply({ content: error.toString(), ephemeral: true }).catch(console.error)
        } else {
          interaction
            .reply({ content: 'Um erro ocorreu ao executar o comando.', ephemeral: true })
            .catch(console.error)
        }
      }
    })
  }
}

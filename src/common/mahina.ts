import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as fs from 'node:fs'

import {
  ApplicationCommandType,
  Client,
  ClientOptions,
  Collection,
  EmbedBuilder,
  Events,
  Interaction,
  PermissionsBitField,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from 'discord.js'

import { ShoukakuClient } from '#common/shoukaku'
import { Utils } from '#src/utils/system'
import { env } from '#src/env'
import { Logger } from '#src/lib/logger'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Mahina extends Client {
  commands: Collection<string, any> = new Collection()
  aliases: Collection<string, any> = new Collection()
  body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
  shoukaku: ShoukakuClient
  cooldown: Collection<string, any> = new Collection()

  env: typeof env = env
  utils: typeof Utils = Utils
  logger: Logger = new Logger()

  readonly color = {
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    yellow: 0xffff00,
    main: 0x2f3136,
  }

  constructor(options: ClientOptions) {
    super(options)

    this.shoukaku = new ShoukakuClient(this)
  }

  async start(token: string): Promise<void> {
    this.loadCommands()
    this.loadEvents()

    await this.login(token)

    // @ts-ignore
    this.on(Events.InteractionCreate, async (interaction: Interaction<'cached'>): Promise<void> => {
      if (interaction.isButton()) this.emit('setupButtons', interaction)
    })
  }

  embed(): EmbedBuilder {
    return new EmbedBuilder()
  }

  /**
   * ------------------------------
   * Private methods
   * ------------------------------
   */
  private loadCommands(): void {
    const commandsPath = fs.readdirSync(path.join(dirname, 'commands'))
    commandsPath.forEach((dir) => {
      const commandFiles = fs
        .readdirSync(path.join(dirname, `/commands/${dir}`))
        .filter((file) => file.endsWith('.js'))

      commandFiles.forEach(async (file) => {
        const { default: cmd } = await import(dirname + `/commands/${dir}/${file}`)
        const command = new cmd(this)
        command.category = dir
        this.commands.set(command.name, command)
        if (command.aliases.length !== 0) {
          command.aliases.forEach((alias: any) => {
            this.aliases.set(alias, command.name)
          })
        }
        if (command.slashCommand) {
          const data = {
            name: command.name,
            description: command.description.content,
            type: ApplicationCommandType.ChatInput,
            options: command.options ? command.options : null,
            name_localizations: command.nameLocalizations ? command.nameLocalizations : null,
            description_localizations: command.descriptionLocalizations
              ? command.descriptionLocalizations
              : null,
            default_member_permissions:
              command.permissions.user.length > 0 ? command.permissions.user : null,
          }
          if (command.permissions.user.length > 0) {
            const permissionValue = PermissionsBitField.resolve(command.permissions.user)
            data.default_member_permissions = permissionValue.toString()
          }
          const json = JSON.stringify(data)
          this.body.push(JSON.parse(json))
        }
      })
    })
    this.once('ready', async () => {
      const applicationCommands = Routes.applicationCommands(this.user!.id ?? '')
      try {
        const rest = new REST({ version: '10' }).setToken(env.DISC_BOT_TOKEN)
        await rest.put(applicationCommands, { body: [] })
        await rest.put(applicationCommands, { body: this.body })
        this.logger.success('Successfully registered application commands.')
      } catch (error) {
        console.error(error)
      }
    })
  }

  private loadEvents(): void {
    const eventsPath = fs.readdirSync(path.join(dirname, '/events'))
    eventsPath.forEach((dir) => {
      const events = fs
        .readdirSync(path.join(dirname, `/events/${dir}`))
        .filter((file) => file.endsWith('.js'))
      events.forEach(async (file) => {
        const { default: event } = await import(dirname + `/events/${dir}/${file}`)
        const evt = new event(this, file)
        switch (dir) {
          case 'player':
            this.shoukaku.on(evt.name, (...args) => evt.run(...args))
            break
          default:
            this.on(evt.name, (...args) => evt.run(...args))
            break
        }
      })
    })
  }
}

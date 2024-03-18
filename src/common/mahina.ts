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

import { env } from '#src/env'

import { Utils } from '#src/utils/utils'
import { Logger } from '#src/lib/logger'
import { Queue, ShoukakuClient } from '#common/index'
import { DB } from '#src/database/models/db'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class Mahina extends Client {
  commands: Collection<string, any> = new Collection()
  aliases: Collection<string, any> = new Collection()
  body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
  shoukaku: ShoukakuClient
  cooldown: Collection<string, any> = new Collection()
  db = new DB()

  env: typeof env = env
  utils: typeof Utils = Utils
  logger: Logger = new Logger()
  queue = new Queue(this)

  readonly color = {
    red: 0xd78799,
    green: 0xbfe4b2,
    blue: 0x499cc2,
    yellow: 0xfcf9a3,
    violet: 0x9e48a8,
    main: 0x4f5aa1,
  }

  readonly icons = {
    youtube: 'https://telegra.ph/file/b691a3033fe2946b68029.png',
    spotify: 'https://telegra.ph/file/4c7d513f95b5419e31e1d.png',
    soundcloud: 'https://telegra.ph/file/151d98d56b1f5e67af6df.png',
    apple_music: 'https://telegra.ph/file/99880df27b3400cc2a513.png',
    deezer: 'https://telegra.ph/file/3f6792d8b87860899e6f9.png',
  }

  readonly links = {
    img: 'https://telegra.ph/file/3d54575cc6b0bdc16095e.png',
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
      if (interaction.isButton()) {
        const setup = await this.db.getSetup(interaction.guildId)
        if (
          setup &&
          interaction.channelId === setup.text_id &&
          interaction.message.id === setup.message_id
        ) {
          this.emit('setupButtons', interaction)
        }
      }
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

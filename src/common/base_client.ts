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
import { AI } from '#src/plugins/gpt.plugin'
import { SelfClient } from '#common/self_client'
import { LexicaApi } from '#src/plugins/lexica.plugin'
import ServerData from '#src/database/server.data'
import { AnimezeyPlugin } from '#src/plugins/animezey.plugin'

import loadPlugins from '#src/extensions/index'
import { initI18n } from '#common/i18n'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export class BaseClient extends Client {
  commands: Collection<string, any> = new Collection()
  aliases: Collection<string, any> = new Collection()
  body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
  shoukaku: ShoukakuClient
  cooldown: Collection<string, any> = new Collection()
  db = new ServerData()

  env: typeof env = env
  utils: typeof Utils = Utils
  logger: Logger = new Logger()

  queue = new Queue(this)
  ai = new AI()
  lexica = new LexicaApi()
  animezey = new AnimezeyPlugin()

  selfClient: SelfClient
  movieFolder = path.join(process.cwd(), 'movies')

  keepAlive = true

  readonly color = {
    red: 0xd78799,
    green: 0xbfe4b2,
    blue: 0x499cc2,
    yellow: 0xfcf9a3,
    violet: 0x9e48a8,
    main: 0x4f5aa1,
  }

  emoji: {
    pause: '⏸️'
    resume: '▶️'
    stop: '⏹️'
    skip: '⏭️'
    previous: '⏮️'
    forward: '⏩'
    rewind: '⏪'
    voldown: '🔉'
    volup: '🔊'
    shuffle: '🔀'
    loop: {
      none: '🔁'
      track: '🔂'
    }
    page: {
      last: '⏩'
      first: '⏪'
      back: '⬅️'
      next: '➡️'
      cancel: '⏹️'
    }
  }

  readonly icons = {
    youtube: 'https://telegra.ph/file/b691a3033fe2946b68029.png',
    spotify: 'https://telegra.ph/file/4c7d513f95b5419e31e1d.png',
    soundcloud: 'https://telegra.ph/file/151d98d56b1f5e67af6df.png',
    applemusic: 'https://telegra.ph/file/99880df27b3400cc2a513.png',
    deezer: 'https://telegra.ph/file/3f6792d8b87860899e6f9.png',
  }

  readonly links = {
    img: 'https://telegra.ph/file/3d54575cc6b0bdc16095e.png',
    live: 'https://telegra.ph/file/8733b86c68e3a169ad4e5.png',
  }

  constructor(options: ClientOptions) {
    super(options)

    this.shoukaku = new ShoukakuClient(this)
    this.selfClient = new SelfClient(this)
  }

  async start(token: string): Promise<void> {
    initI18n()

    this.loadCommands()
    this.logger.info('Successfully loaded commands!')

    this.loadEvents()
    this.logger.info('Successfully loaded events!')

    await loadPlugins(this)
    this.logger.info('Successfully loaded plugins!')

    await this.login(token)

    this.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (interaction.isButton() && interaction.guildId) {
        const setup = await this.db.getSetup(interaction.guildId)
        if (
          setup &&
          interaction.channelId === setup.textId &&
          interaction.message.id === setup.messageId
        ) {
          this.emit('setupButtons', interaction)
        }
      }
    })
  }

  embed(): EmbedBuilder {
    return new EmbedBuilder()
  }

  async createInvite(guildId: string) {
    const guild = await this.guilds.fetch(guildId)

    if (!guild) return ''

    const invites = await guild.invites.fetch()
    const invite = invites.first()

    if (!invite) return ''

    return invite.url
  }

  async deployCommands(guildId?: string): Promise<void> {
    const route = guildId
      ? Routes.applicationGuildCommands(this.user?.id ?? '', guildId)
      : Routes.applicationCommands(this.user?.id ?? '')

    try {
      const rest = new REST({ version: '10' }).setToken(env.DISC_BOT_TOKEN)
      await rest.put(route, { body: this.body })
      this.logger.info('Successfully deployed slash commands!')
    } catch (error) {
      this.logger.error(error)
    }
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
        this.logger.error(error)
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

  private async getNodes(): Promise<any> {
    const params = new URLSearchParams({
      ssl: 'false',
      version: 'v4',
      format: 'shoukaku',
    })
    const res = await fetch(`https://lavainfo-api.deno.dev/nodes?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return await res.json()
  }
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Api } from '@top-gg/sdk'
import {
  ApplicationCommandType,
  Client,
  ClientOptions,
  Collection,
  EmbedBuilder,
  Events,
  type Interaction,
  Locale,
  PermissionsBitField,
  REST,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
} from 'discord.js'

import config from '#src/config'
import ServerData from '#src/database/server'
import { Logger } from '#common/logger'
import MahinaLinkClient from '#common/mahina_link_client'
import { i18n, initI18n, localization, T } from '#common/i18n'
import loadPlugins from '#src/extensions/index'
import { Utils } from '#utils/utils'
import { env } from '#src/env'
import SelfBot from '#common/selfbot'
import { AnimeZey } from '#src/platforms/animezey'
import { NvidiaAIService } from '#src/services/nvidia_ai_service'
import { ProactiveInteractionService } from '#src/services/proactive_interaction_service'
import { LavalinkHealthService } from '#src/services/lavalink_health_service'
import { AIContextService } from '#src/services/ai_context_service'
import { AIMemoryService } from '#src/services/ai_memory_service'
import { AIManager, getAIManager } from '#src/services/ai_manager'
import { NvidiaTTSService } from '#src/services/nvidia_tts_service'
import { NvidiaEmbeddingService } from '#src/services/nvidia_embedding_service'
import { NvidiaCosmosService } from '#src/services/nvidia_cosmos_service'
import { NvidiaGuardService } from '#src/services/nvidia_guard_service'
import { NvidiaEnhancedService } from '#src/services/nvidia_enhanced_service'
import { AIJobService } from '#src/services/ai_job_service'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default class MahinaBot extends Client {
  commands: Collection<string, any> = new Collection()
  aliases: Collection<string, any> = new Collection()
  db = new ServerData()
  cooldown: Collection<string, any> = new Collection()
  config = config
  logger: Logger = new Logger()
  readonly emoji = config.emoji
  readonly color = config.color
  topGG!: Api
  utils = Utils
  env: typeof env = env
  manager!: MahinaLinkClient
  selfbot: SelfBot
  animezey = new AnimeZey()
  services: {
    nvidia?: NvidiaAIService
    nvidiaEnhanced?: NvidiaEnhancedService
    proactiveInteraction?: ProactiveInteractionService
    lavalinkHealth?: LavalinkHealthService
    aiContext?: AIContextService
    aiMemory?: AIMemoryService
    aiJob?: AIJobService
    nvidiaTTS?: NvidiaTTSService
    nvidiaEmbedding?: NvidiaEmbeddingService
    nvidiaCosmos?: NvidiaCosmosService
    nvidiaGuard?: NvidiaGuardService
  } = {}
  aiManager?: AIManager
  private body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

  constructor(options: ClientOptions) {
    super(options)

    this.selfbot = new SelfBot(this)
  }

  embed(): EmbedBuilder {
    return new EmbedBuilder()
  }

  async start(token: string): Promise<void> {
    initI18n()
    if (env.TOPGG) {
      this.topGG = new Api(env.TOPGG)
    } else {
      this.logger.warn('Top.gg token not found!')
    }

    // Initialize AI Manager with all AI services
    try {
      const prisma = await this.db.getPrismaClient()
      this.aiManager = getAIManager(this, prisma)
      await this.aiManager.initialize()

      // Map AI services for backward compatibility and easy access
      this.services.nvidia = this.aiManager.nvidia
      this.services.nvidiaEnhanced = this.aiManager.nvidiaEnhanced
      this.services.aiContext = this.aiManager.context
      this.services.aiMemory = this.aiManager.memory
      this.services.aiJob = this.aiManager.jobs

      this.logger.info('AI Manager and services initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize AI Manager:', error)
      this.logger.warn('AI features will be disabled')
    }

    // Initialize Proactive Interaction Service
    this.services.proactiveInteraction = new ProactiveInteractionService(this)

    // Initialize Lavalink Health Service
    this.services.lavalinkHealth = new LavalinkHealthService(this)

    // Initialize NVIDIA TTS Service
    this.services.nvidiaTTS = new NvidiaTTSService(this)

    // Initialize NVIDIA Embedding Service
    this.services.nvidiaEmbedding = new NvidiaEmbeddingService(this)

    // Initialize NVIDIA Cosmos Service
    this.services.nvidiaCosmos = new NvidiaCosmosService(this)

    // Initialize NVIDIA Guard Service
    this.services.nvidiaGuard = new NvidiaGuardService(this)

    this.manager = new MahinaLinkClient(this)

    await this.loadCommands().finally(() => this.logger.info('Successfully loaded commands!'))

    await this.loadEvents().finally(() => this.logger.info('Successfully loaded events!'))
    await this.login(token).finally(() => this.logger.info('Successfully logged in!'))

    loadPlugins(this)
      .catch(console.error)
      .finally(() => this.logger.info('Successfully loaded plugins!'))

    // this.selfbot.start(env.SELF_USER_TOKEN).then(() => this.logger.info('Self bot 1 is ready'))

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

  async deployCommands(guildId?: string): Promise<void> {
    const route = guildId
      ? Routes.applicationGuildCommands(this.user?.id ?? '', guildId)
      : Routes.applicationCommands(this.user?.id ?? '')

    try {
      const rest = new REST({ version: '10' }).setToken(env.TOKEN ?? '')
      await rest.put(route, { body: this.body })
      this.logger.info('Successfully deployed slash commands!')
    } catch (error) {
      this.logger.error(error)
    }
  }

  private async loadCommands(): Promise<void> {
    const commandsPath = fs.readdirSync(path.join(dirname, 'commands'))
    for (const dir of commandsPath) {
      const commandFiles = fs
        .readdirSync(path.join(dirname, `/commands/${dir}`))
        .filter((file) => file.endsWith('.js'))

      for (const file of commandFiles) {
        const { default: cmd } = await import(dirname + `/commands/${dir}/${file}`)
        const command = new cmd(this)
        command.category = dir

        this.commands.set(command.name, command)
        command.aliases.forEach((alias: string) => {
          this.aliases.set(alias, command.name)
        })

        if (command.slashCommand) {
          const data: RESTPostAPIChatInputApplicationCommandsJSONBody = {
            name: command.name,
            description: T(Locale.PortugueseBR, command.description.content),
            type: ApplicationCommandType.ChatInput,
            options: command.options || [],
            default_member_permissions:
              Array.isArray(command.permissions.user) && command.permissions.user.length > 0
                ? PermissionsBitField.resolve(command.permissions.user as any).toString()
                : null,
            name_localizations: null,
            description_localizations: null,
          }

          const localizations: { name: any[]; description: string[] }[] = []
          i18n.getLocales().map((locale: any) => {
            localizations.push(localization(locale, command.name, command.description.content))
          })

          for (const local of localizations) {
            const [language, name] = local.name
            const [language2, description] = local.description
            data.name_localizations = {
              ...data.name_localizations,
              [language]: name,
            }
            data.description_localizations = {
              ...data.description_localizations,
              [language2]: description,
            }
          }

          for (const local of localizations) {
            const [language, name] = local.name
            const [language2, description] = local.description
            data.name_localizations = {
              ...data.name_localizations,
              [language]: name,
            }
            data.description_localizations = {
              ...data.description_localizations,
              [language2]: description,
            }
          }

          if (command.options.length > 0) {
            command.options.map(
              (option: {
                name: any
                description: string | i18n.TranslateOptions
                name_localizations: any
                description_localizations: any
              }) => {
                const optionsLocalizations: { name: any[]; description: string[] }[] = []
                i18n.getLocales().map((locale: any) => {
                  optionsLocalizations.push(localization(locale, option.name, option.description))
                })

                for (const l of optionsLocalizations) {
                  const [language, name] = l.name
                  const [language2, description] = l.description
                  option.name_localizations = {
                    ...option.name_localizations,
                    [language]: name,
                  }
                  option.description_localizations = {
                    ...option.description_localizations,
                    [language2]: description,
                  }
                }
                option.description = T(Locale.PortugueseBR, option.description)
              }
            )

            data.options?.map((option) => {
              if ('options' in option && option.options!.length > 0) {
                option.options?.map((subOption) => {
                  const subOptionsLocalizations: { name: any[]; description: string[] }[] = []
                  i18n.getLocales().map((locale: any) => {
                    subOptionsLocalizations.push(
                      localization(locale, subOption.name, subOption.description)
                    )
                  })

                  for (const l of subOptionsLocalizations) {
                    const [language, name] = l.name
                    const [language2, description] = l.description
                    subOption.name_localizations = {
                      ...subOption.name_localizations,
                      [language]: name,
                    }
                    subOption.description_localizations = {
                      ...subOption.description_localizations,
                      [language2]: description,
                    }
                  }
                  subOption.description = T(Locale.PortugueseBR, subOption.description)
                })
              }
            })
          }
          this.body.push(data)
        }
      }
    }
  }

  private async loadEvents(): Promise<void> {
    const eventsPath = fs.readdirSync(path.join(dirname, '/events'))

    for (const dir of eventsPath) {
      const events = fs
        .readdirSync(path.join(dirname, `/events/${dir}`))
        .filter((file) => file.endsWith('.js'))

      for (const file of events) {
        const { default: event } = await import(dirname + `/events/${dir}/${file}`)
        const evt = new event(this, file)

        switch (dir) {
          case 'player':
            this.manager.on(evt.name, (...args: any) => evt.run(...args))
            break
          default:
            this.on(evt.name, (...args) => evt.run(...args))
            break
        }
      }
    }
  }
}

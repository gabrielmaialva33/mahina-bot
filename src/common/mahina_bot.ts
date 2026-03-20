import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Api } from '@top-gg/sdk'
import {
  type APIApplicationCommandOption,
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
import DownloadManager from '#common/download_manager'
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
import { NvidiaMultimodalService } from '#src/services/nvidia_multimodal_service'
import { AIQueueService } from '#src/services/ai_queue_service'
import { ServerLearningService } from '#src/services/server_learning_service'
import { MahinaWillService } from '#src/services/mahina_will_service'
import { AmbientPresenceService } from '#src/services/ambient_presence_service'
import type { MahinaBrain } from '#src/services/mahina_brain'
import type { Command as CommandInstance } from '#common/command'

const dirname = path.dirname(fileURLToPath(import.meta.url))

interface BotServices {
  nvidia?: NvidiaAIService
  nvidiaMultimodal?: NvidiaMultimodalService
  proactiveInteraction?: ProactiveInteractionService
  lavalinkHealth?: LavalinkHealthService
  aiContext?: AIContextService
  aiMemory?: AIMemoryService
  aiQueue?: AIQueueService
  brain?: MahinaBrain
  serverLearning?: ServerLearningService
  mahinaWill?: MahinaWillService
  ambientPresence?: AmbientPresenceService
  nvidiaTTS?: NvidiaTTSService
  nvidiaEmbedding?: NvidiaEmbeddingService
  nvidiaCosmos?: NvidiaCosmosService
  nvidiaGuard?: NvidiaGuardService
}

interface RuntimeFeatures {
  ai: boolean
  music: boolean
  selfbot: boolean
}

export default class MahinaBot extends Client {
  commands: Collection<string, CommandInstance> = new Collection()
  aliases: Collection<string, string> = new Collection()
  db = new ServerData()
  cooldown: Collection<string, number> = new Collection()
  config = config
  logger: Logger = new Logger()
  readonly emoji = config.emoji
  readonly color = config.color
  topGG?: Api
  utils = Utils
  env: typeof env = env
  manager!: MahinaLinkClient
  selfbot: SelfBot
  downloadManager: DownloadManager
  animezey = new AnimeZey()
  services: BotServices = {}
  aiManager?: AIManager
  runtime: RuntimeFeatures
  private body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []

  constructor(options: ClientOptions) {
    super(options)

    this.runtime = {
      ai: env.ENABLE_AI,
      music: env.ENABLE_MUSIC,
      selfbot: env.ENABLE_SELFBOT,
    }
    this.selfbot = new SelfBot(this)
    this.downloadManager = new DownloadManager(this.logger)
  }

  embed(): EmbedBuilder {
    return new EmbedBuilder()
  }

  async start(token: string): Promise<void> {
    initI18n()
    this.setupTopGG()
    await this.setupAIManager()
    this.setupServices()

    if (this.runtime.music) {
      this.manager = new MahinaLinkClient(this)
    } else {
      this.logger.warn('Music runtime is disabled')
    }

    await this.loadCommands()
    this.logger.info('Successfully loaded commands!')

    await this.loadEvents()
    this.logger.info('Successfully loaded events!')

    await this.login(token)
    this.logger.info('Successfully logged in!')

    loadPlugins(this)
      .catch(console.error)
      .finally(() => this.logger.info('Successfully loaded plugins!'))

    if (this.runtime.selfbot && env.SELF_USER_TOKEN) {
      this.selfbot.start(env.SELF_USER_TOKEN).then(() => this.logger.info('Selfbot is ready'))
    } else {
      this.logger.warn('Selfbot runtime is disabled or SELF_USER_TOKEN not set')
    }

    this.registerInteractionHandlers()
  }

  private setupTopGG(): void {
    if (env.TOPGG) {
      this.topGG = new Api(env.TOPGG)
      return
    }

    this.logger.warn('Top.gg token not found. Auto poster disabled.')
  }

  private async setupAIManager(): Promise<void> {
    if (!this.runtime.ai) {
      this.logger.warn('AI runtime is disabled')
      return
    }

    try {
      const prisma = await this.db.getPrismaClient()
      this.aiManager = getAIManager(this, prisma)
      await this.aiManager.initialize()

      this.services.nvidia = this.aiManager.nvidia
      this.services.nvidiaMultimodal = this.aiManager.nvidiaMultimodal
      this.services.aiContext = this.aiManager.context
      this.services.aiMemory = this.aiManager.memory
      this.services.aiQueue = this.aiManager.queue
      this.services.brain = this.aiManager.brain
    } catch (error) {
      this.logger.error('Failed to initialize AI Manager:', error)
      this.logger.warn('AI features will be disabled')
    }
  }

  private setupServices(): void {
    if (this.runtime.ai) {
      this.services.proactiveInteraction = new ProactiveInteractionService(this)
      this.services.nvidiaTTS = new NvidiaTTSService(this)
      this.services.nvidiaEmbedding = new NvidiaEmbeddingService(this)
      this.services.nvidiaCosmos = new NvidiaCosmosService(this)
      this.services.nvidiaGuard = new NvidiaGuardService(this)
      this.services.serverLearning = new ServerLearningService(this)
      this.services.mahinaWill = new MahinaWillService(this)
      this.services.ambientPresence = new AmbientPresenceService(this)
      this.logger.debug('AI optional services ready: proactive, tts, embedding, cosmos, guard')
    }

    if (this.runtime.music) {
      this.services.lavalinkHealth = new LavalinkHealthService(this)
    }
  }

  private registerInteractionHandlers(): void {
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
                ? PermissionsBitField.resolve(command.permissions.user).toString()
                : null,
            name_localizations: null,
            description_localizations: null,
          }

          const localizations = i18n
            .getLocales()
            .map((locale) => localization(locale, command.name, command.description.content))

          for (const local of localizations) {
            data.name_localizations = {
              ...data.name_localizations,
              [local.locale]: local.name,
            }
            data.description_localizations = {
              ...data.description_localizations,
              [local.locale]: local.description,
            }
          }

          if (command.options.length > 0) {
            command.options.map((option) => {
              const optionLocalizations = i18n
                .getLocales()
                .map((locale) => localization(locale, option.name, option.description))

              for (const local of optionLocalizations) {
                option.name_localizations = {
                  ...option.name_localizations,
                  [local.locale]: local.name,
                }
                option.description_localizations = {
                  ...option.description_localizations,
                  [local.locale]: local.description,
                }
              }
              option.description = T(Locale.PortugueseBR, option.description)
            })

            data.options?.map((option) => {
              if ('options' in option && option.options!.length > 0) {
                option.options?.map((subOption) => {
                  const subOptionsLocalizations = i18n
                    .getLocales()
                    .map((locale) => localization(locale, subOption.name, subOption.description))

                  for (const local of subOptionsLocalizations) {
                    subOption.name_localizations = {
                      ...subOption.name_localizations,
                      [local.locale]: local.name,
                    }
                    subOption.description_localizations = {
                      ...subOption.description_localizations,
                      [local.locale]: local.description,
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
            this.manager.on(evt.name, (...args: unknown[]) => evt.run(...args))
            break
          default:
            this.on(evt.name, (...args) => evt.run(...args))
            break
        }
      }
    }
  }
}

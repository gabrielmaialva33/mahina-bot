import { Mahina } from '#common/mahina'
import { ApplicationCommandOption, PermissionResolvable } from 'discord.js'

export class Command {
  client: Mahina
  name: string
  name_localizations?: any
  description: {
    content: string | null
    usage: string | null
    examples: string[] | null
  }
  description_localizations?: any
  aliases: string[] = []
  cooldown: number = 3
  options: ApplicationCommandOption[]
  permissions: {
    dev: boolean
    client: string[] | PermissionResolvable
    user: string[] | PermissionResolvable
  }
  args: boolean = false
  slashCommand?: boolean
  category: string | null
  player: {
    voice: boolean
    dj: boolean
    active: boolean
    dj_perm: string | null
  }

  constructor(client: Mahina, options: CommandOptions) {
    this.client = client

    this.name = options.name
    this.name_localizations = options.name_localizations
    this.description = {
      content: options.description
        ? options.description.content || 'No description provided'
        : 'No description provided',
      usage: options.description
        ? options.description.usage || 'No usage provided'
        : 'No usage provided',
      examples: options.description ? options.description.examples || [''] : [''],
    }
    this.description_localizations = options.description_localizations

    this.aliases = options.aliases || []
    this.cooldown = options.cooldown || 3
    this.args = options.args || false

    this.player = {
      voice: options.player ? options.player.voice || false : false,
      dj: options.player ? options.player.dj || false : false,
      active: options.player ? options.player.active || false : false,
      dj_perm: options.player ? options.player.dj_perm || null : null,
    }

    this.permissions = {
      dev: options.permissions ? options.permissions.dev || false : false,
      client: options.permissions
        ? options.permissions.client || []
        : ['SendMessages', 'ViewChannel', 'EmbedLinks'],
      user: options.permissions ? options.permissions.user || [] : [],
    }

    this.options = options.options || []
    this.slashCommand = options.slashCommand || false
    this.category = options.category || 'general'
  }

  async run(_client: Mahina, _message: any, _args: string[]): Promise<any> {
    return await Promise.resolve()
  }
}

interface CommandOptions {
  name: string
  name_localizations?: any
  description?: {
    content: string
    usage: string
    examples: string[]
  }
  description_localizations?: any
  cooldown: number
  aliases?: string[]
  options?: ApplicationCommandOption[]
  slashCommand?: boolean
  category?: string
  args?: boolean
  player?: {
    voice: boolean
    dj: boolean
    active: boolean
    dj_perm: string | null
  }
  permissions?: {
    dev: boolean
    client: string[] | PermissionResolvable
    user: string[] | PermissionResolvable
  }
}

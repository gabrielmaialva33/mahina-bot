import { Mahina } from '#common/mahina'
import { ApplicationCommandOption, PermissionResolvable } from 'discord.js'

export class Command {
  client: Mahina
  name: string
  description: {
    content: string | null
    usage: string | null
    examples: string[] | null
  }
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

  constructor(client: Mahina, options: CommandOptions) {
    this.client = client

    this.name = options.name
    this.description = options.description || {
      content: 'No description provided',
      usage: null,
      examples: [],
    }

    this.aliases = options.aliases || []
    this.cooldown = options.cooldown || 3
    this.args = options.args || false

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
  description?: {
    content: string
    usage: string
    examples: string[]
  }
  cooldown: number
  aliases?: string[]
  options?: ApplicationCommandOption[]
  slashCommand?: boolean
  category?: string
  args?: boolean
  permissions?: {
    dev: boolean
    client: string[] | PermissionResolvable
    user: string[] | PermissionResolvable
  }
}

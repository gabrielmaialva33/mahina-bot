import {
  type APIInteractionGuildMember,
  ChatInputCommandInteraction,
  type CommandInteraction,
  type Guild,
  type GuildMember,
  type GuildMemberResolvable,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type MessagePayload,
  type TextBasedChannel,
  type TextChannel,
  type User,
} from 'discord.js'

import type MahinaBot from '#common/mahina_bot'
import { T } from '#common/i18n'
import { env } from '#src/env'

export default class Context {
  ctx: CommandInteraction | Message
  interaction: CommandInteraction | null
  message: Message | null
  id: string
  channelId: string
  client: MahinaBot
  author: User | null
  channel: TextBasedChannel
  guild: Guild
  createdAt: Date
  createdTimestamp: number
  member: GuildMemberResolvable | GuildMember | APIInteractionGuildMember | null
  args: any[]
  msg: any
  guildLocale: string | undefined
  options = {
    getRole: (name: string, required = true) => {
      return this.interaction?.options.get(name, required)?.role
    },
    getMember: (name: string, required = true) => {
      return this.interaction?.options.get(name, required)?.member
    },
    get: (name: string, required = true) => {
      return this.interaction?.options.get(name, required)
    },
    getChannel: (name: string, required = true) => {
      return this.interaction?.options.get(name, required)?.channel
    },
    getSubCommand: () => {
      return this.interaction?.options.data[0].name
    },
  }

  constructor(ctx: ChatInputCommandInteraction | Message, args: any[]) {
    this.ctx = ctx
    this.interaction = ctx instanceof ChatInputCommandInteraction ? ctx : null
    this.message = ctx instanceof Message ? ctx : null
    this.channel = ctx.channel!
    this.id = ctx.id
    this.channelId = ctx.channelId
    this.client = ctx.client as MahinaBot
    this.author = ctx instanceof Message ? ctx.author : ctx.user
    this.guild = ctx.guild!
    this.createdAt = ctx.createdAt
    this.createdTimestamp = ctx.createdTimestamp
    this.member = ctx.member
    this.args = args
    this.setArgs(args)
    this.setUpLocale()
  }

  get isInteraction(): boolean {
    return this.ctx instanceof ChatInputCommandInteraction
  }

  get deferred(): boolean | undefined {
    return this.isInteraction ? this.interaction?.deferred : !!this.msg
  }

  setArgs(args: any[]): void {
    this.args = this.isInteraction ? args.map((arg: { value: any }) => arg.value) : args
  }

  async sendMessage(
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ): Promise<Message> {
    if (this.isInteraction) {
      if (typeof content === 'string' || isInteractionReplyOptions(content)) {
        this.msg = await this.interaction?.reply(content)
        return this.msg
      }
    } else if (typeof content === 'string' || isMessagePayload(content)) {
      this.msg = await (this.message?.channel as TextChannel).send(content)
      return this.msg
    }
    return this.msg
  }

  async editMessage(
    content: string | MessagePayload | InteractionEditReplyOptions | MessageEditOptions
  ): Promise<Message> {
    if (this.isInteraction && this.msg) {
      this.msg = await this.interaction?.editReply(content)
      return this.msg
    }
    if (this.msg) {
      this.msg = await this.msg.edit(content)
      return this.msg
    }
    return this.msg
  }

  async sendDeferMessage(
    content: string | MessagePayload | MessageCreateOptions,
    ephemeral = false
  ): Promise<Message> {
    if (this.isInteraction) {
      this.msg = await this.interaction?.deferReply({ fetchReply: true, ephemeral })
      return this.msg
    }

    this.msg = await (this.message?.channel as TextChannel).send(content)
    return this.msg
  }

  async editReply(
    content: string | MessagePayload | InteractionEditReplyOptions | MessageEditOptions
  ): Promise<Message> {
    if (this.isInteraction && this.msg) {
      this.msg = await this.interaction?.editReply(content)
      return this.msg
    }
    if (this.msg) {
      this.msg = await this.msg.edit(content)
      return this.msg
    }
    return this.msg
  }

  locale(key: string, ...args: any) {
    if (!this.guildLocale) this.guildLocale = env.DEFAULT_LANGUAGE || 'PortugueseBR'
    return T(this.guildLocale, key, ...args)
  }

  async sendFollowUp(
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ): Promise<void> {
    if (this.isInteraction) {
      if (typeof content === 'string' || isInteractionReplyOptions(content)) {
        await this.interaction?.followUp(content)
      }
    } else if (typeof content === 'string' || isMessagePayload(content)) {
      this.msg = await (this.message?.channel as TextChannel).send(content)
    }
  }

  private async setUpLocale(): Promise<void> {
    const defaultLanguage = env.DEFAULT_LANGUAGE || 'PortugueseBR'
    this.guildLocale = this.guild
      ? await this.client.db.getLanguage(this.guild.id)
      : defaultLanguage
  }
}

function isInteractionReplyOptions(content: any): content is InteractionReplyOptions {
  return content instanceof Object
}

function isMessagePayload(content: any): content is MessagePayload {
  return content instanceof Object
}

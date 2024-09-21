import {
  APIInteractionGuildMember,
  ChannelType,
  ChatInputCommandInteraction,
  CommandInteraction,
  DMChannel,
  Guild,
  GuildMember,
  GuildMemberResolvable,
  GuildTextBasedChannel,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  MessagePayload,
  PartialDMChannel,
  TextChannel,
  User,
} from 'discord.js'

import { BaseClient } from '#common/base_client'
import { T } from '#common/i18n'
import { Language } from '#src/types'

export class Context {
  ctx: CommandInteraction | Message
  interaction: CommandInteraction | null
  message: Message | null
  id: string
  channelId: string
  client: BaseClient
  author: User | null
  channel: PartialDMChannel | GuildTextBasedChannel | TextChannel | DMChannel | null = null
  guild: Guild | null
  createdAt: Date
  createdTimestamp: number
  member: GuildMemberResolvable | GuildMember | APIInteractionGuildMember | null
  args: any[] | undefined
  msg: any
  guildLocale: string

  constructor(ctx: ChatInputCommandInteraction | Message, args: any[]) {
    this.ctx = ctx
    this.interaction = ctx instanceof ChatInputCommandInteraction ? ctx : null
    this.message = ctx instanceof Message ? ctx : null

    if (ctx.channel && ctx.channel.type !== ChannelType.GroupDM) this.channel = ctx.channel
    else this.channel = null

    this.id = ctx.id
    this.channelId = ctx.channelId
    this.client = ctx.client as BaseClient
    this.author = ctx instanceof Message ? ctx.author : ctx.user
    this.guild = ctx.guild
    this.createdAt = ctx.createdAt
    this.createdTimestamp = ctx.createdTimestamp
    this.member = ctx.member
    this.setArgs(args)
    this.setUpLocale()
  }

  private async setUpLocale(): Promise<void> {
    this.guildLocale = this.guild
      ? await this.client.db.getLanguage(this.guild.id)
      : Language.EnglishUS
  }

  get isInteraction(): boolean {
    return this.ctx instanceof ChatInputCommandInteraction
  }

  get deferred(): boolean | Promise<any> {
    if (this.isInteraction) if (this.interaction) return this.interaction.deferred
    return !!this.msg
  }

  setArgs(args: any[]): void {
    this.args = this.isInteraction ? args.map((arg: { value: any }) => arg.value) : args
  }

  setMessage(message: Message): void {
    this.message = message
  }

  async sendMessage(
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ): Promise<Message> {
    if (this.isInteraction) {
      if (typeof content === 'string' || isInteractionReplyOptions(content)) {
        if (this.interaction) {
          this.msg = await this.interaction.reply(content)
          return this.msg
        }
      }
    } else if (typeof content === 'string' || isMessagePayload(content)) {
      if (this.message) {
        this.msg = await (this.message.channel as TextChannel).send(content)
        return this.msg
      }
    }
    return this.msg
  }

  async editMessage(
    content: string | MessagePayload | InteractionEditReplyOptions | MessageEditOptions
  ): Promise<Message> {
    if (this.isInteraction && this.msg) {
      if (this.interaction) {
        this.msg = await this.interaction.editReply(content)
        return this.msg
      }
    }
    if (this.msg) {
      this.msg = await this.msg.edit(content)
      return this.msg
    }
    return this.msg
  }

  async sendDeferMessage(
    content: string | MessagePayload | MessageCreateOptions
  ): Promise<Message> {
    if (this.isInteraction) {
      if (this.interaction) {
        this.msg = await this.interaction.deferReply({ fetchReply: true })
        return this.msg
      }
    }

    if (this.message) {
      this.msg = await (this.message.channel as TextChannel).send(content)
      return this.msg
    }

    return this.msg
  }

  locale(key: string, ...args: any) {
    return T(this.guildLocale, key, ...args)
  }

  async sendFollowUp(
    content: string | MessagePayload | MessageCreateOptions | InteractionReplyOptions
  ): Promise<void> {
    if (this.isInteraction) {
      if (typeof content === 'string' || isInteractionReplyOptions(content)) {
        if (this.interaction) await this.interaction.followUp(content)
      }
    } else if (typeof content === 'string' || isMessagePayload(content)) {
      if (this.message) this.msg = await (this.message.channel as TextChannel).send(content)
    }
  }

  async sendReply(content: any): Promise<Message | void> {
    if (this.isInteraction) {
      if (this.interaction) {
        this.msg = await this.interaction.reply(content)
        return this.msg
      }
    } else {
      if (this.message) {
        this.msg = await this.message.reply(content)
        return this.msg
      }
    }
  }
}

function isInteractionReplyOptions(content: any): content is InteractionReplyOptions {
  return content instanceof Object
}

function isMessagePayload(content: any): content is MessagePayload {
  return content instanceof Object
}

import {
  APIInteractionGuildMember,
  ChatInputCommandInteraction,
  CommandInteraction,
  DMChannel,
  Guild,
  GuildMember,
  GuildMemberResolvable,
  GuildTextBasedChannel,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  PartialDMChannel,
  TextChannel,
  User,
} from 'discord.js'

import { BaseClient } from '#common/base_client'

export class Context {
  ctx: CommandInteraction | Message | ChatInputCommandInteraction
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

  constructor(ctx: ChatInputCommandInteraction | Message, args: any[]) {
    this.ctx = ctx
    this.interaction = this.ctx instanceof ChatInputCommandInteraction ? this.ctx : null
    this.message = this.ctx instanceof Message ? this.ctx : null
    this.channel = this.ctx.channel
    this.id = ctx.id
    this.channelId = ctx.channelId
    this.client = ctx.client as BaseClient
    this.author = ctx instanceof Message ? ctx.author : ctx.user
    this.channel = ctx.channel
    this.guild = ctx.guild
    this.createdAt = ctx.createdAt
    this.createdTimestamp = ctx.createdTimestamp
    this.member = ctx.member
    this.setArgs(args)
  }

  get isInteraction(): boolean {
    return this.ctx instanceof ChatInputCommandInteraction
  }

  get deferred(): boolean | Promise<any> {
    if (this.isInteraction) if (this.interaction) return this.interaction.deferred
    return !!this.msg
  }

  setArgs(args: any[]): void {
    if (this.isInteraction) {
      this.args = args.map((arg: { value: any }) => arg.value)
    } else {
      this.args = args
    }
  }

  setMessage(message: Message): void {
    this.message = message
  }

  async sendMessage(content: any): Promise<Message | void> {
    if (this.isInteraction) {
      if (this.interaction) {
        if (this.interaction.deferred) {
          this.msg = await this.interaction.editReply(content)
        } else {
          this.msg = this.interaction.reply(content)
          return this.msg
        }
      }
    } else {
      if (this.message) {
        this.msg = await (this.message.channel as TextChannel).send(content)
        return this.msg
      }
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

  async editMessage(content: any) {
    if (this.isInteraction) {
      if (this.msg) {
        if (this.interaction) {
          this.msg = await this.interaction.editReply(content)
          return this.msg
        }
      }
    } else {
      if (this.msg) this.msg = await this.msg.edit(content)
      return this.msg
    }
  }

  async sendDeferMessage(content: any): Promise<Message | void> {
    if (this.isInteraction) {
      if (this.interaction) {
        this.msg = await this.interaction.deferReply({ fetchReply: true })
        return this.msg
      }
    } else {
      if (this.message) {
        this.msg = await (this.message.channel as TextChannel).send(content)
        return this.msg
      }
    }
  }

  async sendFollowUp(content: any): Promise<void> {
    if (this.isInteraction)
      if (this.interaction) await this.interaction.followUp(content)
      else if (this.message) this.msg = await (this.message.channel as TextChannel).send(content)
  }
}

function isInteractionReplyOptions(content: any): content is InteractionReplyOptions {
  return content instanceof Object
}

function isMessagePayload(content: any): content is MessagePayload {
  return content instanceof Object
}

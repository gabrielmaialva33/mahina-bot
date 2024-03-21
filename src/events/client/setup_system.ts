import { Message, PermissionsBitField, TextChannel } from 'discord.js'

import { BaseClient, Event } from '#common/index'
import { oops, setupStart } from '#utils/setup_system'

export default class SetupSystem extends Event {
  constructor(client: BaseClient, file: string) {
    super(client, file, { name: 'setupSystem' })
  }

  async run(message: Message): Promise<void> {
    let channel = message.channel as any

    if (!(channel instanceof TextChannel)) return
    if (!message.member!.voice.channel) {
      await oops(
        channel,
        `𝙈𝙖𝙣𝙖.. 𝙤𝙘𝙚 𝙣𝙖̃𝙤 𝙚𝙨𝙩𝙖́ 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙙𝙚 𝙖 𝙪𝙢𝙚 𝙘𝙖𝙣𝙖𝙡 𝙙𝙚 𝙫𝙤𝙯 𝙥𝙖𝙧𝙖 𝙘𝙤𝙡𝙤𝙘𝙖𝙧 𝙢𝙪́𝙨𝙞𝙘𝙖𝙨 𝙣𝙖 𝙛𝙞𝙡𝙖.`
      )
      if (message) await message.delete().catch(() => {})
      return
    }

    if (
      !message
        // @ts-ignore
        .member!.voice.channel.permissionsFor(this.client.user)
        .has(PermissionsBitField.resolve(['Connect', 'Speak']))
    ) {
      await oops(
        channel,
        `𝙈𝙖𝙣𝙖̃.. 𝙘̧𝙤𝙪 𝙘𝙖𝙨𝙩𝙖 𝙗𝙖𝙞𝙭𝙖.. 𝙣𝙖̃𝙤 𝙩𝙚𝙣𝙝𝙤 𝙥𝙚𝙧𝙢𝙞𝙨𝙨𝙖̃𝙤 𝙨𝙪𝙛𝙞𝙘𝙞𝙚𝙣𝙩𝙚 𝙥𝙖𝙧𝙖 𝙘𝙤𝙣𝙚𝙘𝙩𝙖𝙧/𝙛𝙖𝙡𝙖𝙧 <#${message.member!.voice.channel.id}>`
      )
      if (message) await message.delete().catch(() => {})
      return
    }

    if (
      message.guild!.members.cache.get(this.client.user!.id)!.voice.channel &&
      message.guild!.members.cache.get(this.client.user!.id)!.voice.channelId !==
        message.member!.voice.channelId
    ) {
      await oops(
        channel,
        `You are not connected to <#${
          message.guild!.members.cache.get(this.client.user!.id)!.voice.channelId
        }> to queue songs`
      )
      if (message) await message.delete().catch(() => {})
      return
    }
    let player = this.client.queue.get(message.guildId!)
    if (!player) {
      player = await this.client.queue.create(
        message.guild!,
        message.member!.voice.channel,
        message.channel,
        this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes)
      )
    }
    await setupStart(this.client, message.content, player, message)
    if (message) await message.delete().catch(() => {})
  }
}
